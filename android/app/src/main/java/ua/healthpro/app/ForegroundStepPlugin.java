package ua.healthpro.app;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.ServiceConnection;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.provider.Settings;
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
 *   - start(goal, notifTitle, notifText, initialSteps) → starts StepCounterService
 *   - stop()                                           → stops the service
 *   - getSteps()                           → { steps, running, sensorAvailable }
 *   - checkActivityPermission()            → { status: 'granted'|'denied'|'prompt' }
 *   - requestActivityPermission()          → { status: 'granted'|'denied' }
 *   - getBatteryOptStatus()                → { ignored: boolean }
 *   - requestBatteryOpt()                  → opens system battery-opt dialog
 *
 * JS event listener:
 *   - 'stepUpdate' → { steps: number, goal: number }
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

    private StepCounterService stepService        = null;
    private boolean            serviceBound       = false;
    private BroadcastReceiver  stepReceiver       = null;
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
            Log.d(TAG, "Service disconnected — will rebind on next start()");
        }
    };

    // ── Plugin methods ───────────────────────────────────────────────────────

    /**
     * Start the foreground service.
     * @param initialSteps  Daily steps already counted before this service session
     *                      (read from app DB so the broadcast always reflects the
     *                      true daily total, not just steps since service start).
     */
    @PluginMethod
    public void start(PluginCall call) {
        int    goal         = call.getInt("goal",         10000);
        String title        = call.getString("notifTitle", "HealthPro \uD83E\uDDB6");
        String text         = call.getString("notifText",  "\u0420\u0430\u0445\u0443\u044e \u043a\u0440\u043e\u043a\u0438...");
        int    initialSteps = call.getInt("initialSteps", 0);

        Context ctx = getContext();
        Intent  svc = new Intent(ctx, StepCounterService.class);
        svc.putExtra(StepCounterService.EXTRA_START_GOAL,    goal);
        svc.putExtra(StepCounterService.EXTRA_NOTIF_TITLE,   title);
        svc.putExtra(StepCounterService.EXTRA_NOTIF_TEXT,    text);
        svc.putExtra(StepCounterService.EXTRA_INITIAL_STEPS, initialSteps);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(svc);
        } else {
            ctx.startService(svc);
        }

        if (!serviceBound) {
            ctx.bindService(svc, serviceConnection, Context.BIND_AUTO_CREATE);
        }
        registerStepReceiver();
        call.resolve();
    }

    /** Stop the foreground service and clear the running state flag. */
    @PluginMethod
    public void stop(PluginCall call) {
        Context ctx = getContext();
        if (serviceBound) {
            if (stepService != null) stepService.clearRunningState();
            try { ctx.unbindService(serviceConnection); } catch (Exception ignored) {}
            serviceBound = false;
            stepService  = null;
        }
        unregisterStepReceiver();
        ctx.stopService(new Intent(ctx, StepCounterService.class));
        call.resolve();
    }

    /**
     * Get current step count and service health.
     * Returns { steps, running, sensorAvailable }.
     * 'running' lets JS detect a dead service without polling a separate endpoint.
     */
    @PluginMethod
    public void getSteps(PluginCall call) {
        boolean running         = serviceBound && stepService != null;
        int     steps           = running ? stepService.getStepCount() : 0;
        boolean sensorAvailable = running && stepService.isSensorAvailable();

        JSObject ret = new JSObject();
        ret.put("steps",           steps);
        ret.put("running",         running);
        ret.put("sensorAvailable", sensorAvailable);
        call.resolve(ret);
    }

    /** Returns { ignored: boolean } — whether battery optimisation is disabled for this app. */
    @PluginMethod
    public void getBatteryOptStatus(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm  = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            String        pkg = getContext().getPackageName();
            ret.put("ignored", pm != null && pm.isIgnoringBatteryOptimizations(pkg));
        } else {
            ret.put("ignored", true);
        }
        call.resolve(ret);
    }

    /**
     * Opens the system screen that lets the user whitelist this app from
     * battery optimisation (ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).
     * No-op on Android < M or if already whitelisted.
     */
    @PluginMethod
    public void requestBatteryOpt(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm  = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            String        pkg = getContext().getPackageName();
            if (pm != null && !pm.isIgnoringBatteryOptimizations(pkg)) {
                Intent intent = new Intent(
                        Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                        Uri.parse("package:" + pkg));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                try { getContext().startActivity(intent); } catch (Exception ignored) {}
            }
        }
        call.resolve();
    }

    // ── Permission methods ───────────────────────────────────────────────────

    @PluginMethod
    public void checkActivityPermission(PluginCall call) {
        String status;
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            status = "granted";
        } else {
            status = getPermissionState(PERM_ALIAS).toString().toLowerCase();
        }
        JSObject ret = new JSObject();
        ret.put("status", status);
        call.resolve(ret);
    }

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
