package ua.healthpro.app;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.ServiceConnection;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Capacitor Plugin Bridge for the Foreground Step Counter Service.
 *
 * Exposed JS methods:
 *   - start(goal, notifTitle, notifText)  → starts StepCounterService
 *   - stop()                               → stops the service
 *   - getSteps()                           → { steps, sensorAvailable }
 *   - checkActivityPermission()            → { status: 'granted'|'denied'|'prompt' }
 *   - requestActivityPermission()          → { status: 'granted'|'denied' }
 *
 * JS event listener:
 *   - 'stepUpdate' → { steps: number, goal: number }
 *
 * Registered in MainActivity.java via registerPlugin(ForegroundStepPlugin.class).
 */
@CapacitorPlugin(
    name = "ForegroundStep",
    permissions = {
        @Permission(
            alias = "activityRecognition",
            strings = { Manifest.permission.ACTIVITY_RECOGNITION }
        )
    }
)
public class ForegroundStepPlugin extends Plugin {

    private static final String TAG        = "ForegroundStepPlugin";
    private static final String PERM_ALIAS = "activityRecognition";

    private StepCounterService stepService   = null;
    private boolean            serviceBound  = false;
    private BroadcastReceiver  stepReceiver  = null;
    private boolean            receiverRegistered = false;

    // ── ServiceConnection ────────────────────────────────────────────────────

    private final ServiceConnection serviceConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder binder) {
            StepCounterService.LocalBinder lb = (StepCounterService.LocalBinder) binder;
            stepService  = lb.getService();
            serviceBound = true;
            Log.d(TAG, "Service bound");
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            stepService  = null;
            serviceBound = false;
            Log.d(TAG, "Service disconnected");
        }
    };

    // ── Plugin methods ───────────────────────────────────────────────────────

    /** Start the foreground service and bind to it. */
    @PluginMethod
    public void start(PluginCall call) {
        int    goal  = call.getInt("goal",       10000);
        String title = call.getString("notifTitle", "HealthPro \uD83E\uDDB6");
        String text  = call.getString("notifText",  "\u0420\u0430\u0445\u0443\u044e \u043a\u0440\u043e\u043a\u0438...");

        Context ctx = getContext();
        Intent  svc = new Intent(ctx, StepCounterService.class);
        svc.putExtra(StepCounterService.EXTRA_START_GOAL,  goal);
        svc.putExtra(StepCounterService.EXTRA_NOTIF_TITLE, title);
        svc.putExtra(StepCounterService.EXTRA_NOTIF_TEXT,  text);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(svc);
        } else {
            ctx.startService(svc);
        }
        ctx.bindService(svc, serviceConnection, Context.BIND_AUTO_CREATE);

        registerStepReceiver();
        call.resolve();
    }

    /** Stop the foreground service. */
    @PluginMethod
    public void stop(PluginCall call) {
        Context ctx = getContext();
        if (serviceBound) {
            try { ctx.unbindService(serviceConnection); } catch (Exception ignored) {}
            serviceBound = false;
            stepService  = null;
        }
        unregisterStepReceiver();
        ctx.stopService(new Intent(ctx, StepCounterService.class));
        call.resolve();
    }

    /** Get current step count from the running service. */
    @PluginMethod
    public void getSteps(PluginCall call) {
        int     steps           = (serviceBound && stepService != null) ? stepService.getStepCount() : 0;
        boolean sensorAvailable = (serviceBound && stepService != null) && stepService.isSensorAvailable();

        JSObject ret = new JSObject();
        ret.put("steps",           steps);
        ret.put("sensorAvailable", sensorAvailable);
        call.resolve(ret);
    }

    /** Check ACTIVITY_RECOGNITION permission status without prompting. */
    @PluginMethod
    public void checkActivityPermission(PluginCall call) {
        String status;
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            // Android < 10: no runtime permission needed
            status = "granted";
        } else {
            status = getPermissionState(PERM_ALIAS).toString().toLowerCase();
        }
        JSObject ret = new JSObject();
        ret.put("status", status);
        call.resolve(ret);
    }

    /** Request ACTIVITY_RECOGNITION permission (shows system dialog). */
    @PluginMethod
    public void requestActivityPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            JSObject ret = new JSObject();
            ret.put("status", "granted");
            call.resolve(ret);
            return;
        }
        requestPermissionForAlias(PERM_ALIAS, call, "activityPermCallback");
    }

    @PermissionCallback
    private void activityPermCallback(PluginCall call) {
        String status = getPermissionState(PERM_ALIAS).toString().toLowerCase();
        JSObject ret  = new JSObject();
        ret.put("status", status);
        call.resolve(ret);
    }

    // ── BroadcastReceiver (service → JS) ────────────────────────────────────

    private void registerStepReceiver() {
        if (receiverRegistered) return;
        stepReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                int steps = intent.getIntExtra(StepCounterService.EXTRA_STEPS, 0);
                int goal  = intent.getIntExtra(StepCounterService.EXTRA_GOAL,  10000);
                JSObject data = new JSObject();
                data.put("steps", steps);
                data.put("goal",  goal);
                notifyListeners("stepUpdate", data);
            }
        };

        IntentFilter filter = new IntentFilter(StepCounterService.ACTION_STEP_UPDATE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(stepReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(stepReceiver, filter);
        }
        receiverRegistered = true;
    }

    private void unregisterStepReceiver() {
        if (!receiverRegistered || stepReceiver == null) return;
        try { getContext().unregisterReceiver(stepReceiver); } catch (Exception ignored) {}
        receiverRegistered = false;
    }

    // ── Lifecycle ────────────────────────────────────────────────────────────

    @Override
    protected void handleOnDestroy() {
        unregisterStepReceiver();
        if (serviceBound) {
            try { getContext().unbindService(serviceConnection); } catch (Exception ignored) {}
            serviceBound = false;
        }
    }
}
