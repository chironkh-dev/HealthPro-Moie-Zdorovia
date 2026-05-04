package ua.healthpro.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Restarts the step-counter foreground service after:
 *   - Device reboot (ACTION_BOOT_COMPLETED)
 *   - App update / reinstall (MY_PACKAGE_REPLACED)
 *
 * Only restarts if the user had the counter running before the event,
 * detected via a SharedPreferences flag saved by StepCounterService.
 *
 * Registered in AndroidManifest.xml with RECEIVE_BOOT_COMPLETED permission
 * (already declared for local-notification scheduling).
 */
public class BootReceiver extends BroadcastReceiver {

    private static final String TAG = "BootReceiver";

    static final String PREFS_NAME      = "hp_step_prefs";
    static final String KEY_WAS_RUNNING = "was_running";
    static final String KEY_GOAL        = "goal";
    static final String KEY_DATE        = "step_date";
    static final String KEY_SAVED_STEPS = "saved_steps";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent == null ? "" : String.valueOf(intent.getAction());

        boolean isBoot    = Intent.ACTION_BOOT_COMPLETED.equals(action);
        boolean isUpdate  = Intent.ACTION_MY_PACKAGE_REPLACED.equals(action);
        if (!isBoot && !isUpdate) return;

        SharedPreferences prefs =
                context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean wasRunning = prefs.getBoolean(KEY_WAS_RUNNING, false);

        if (!wasRunning) {
            Log.d(TAG, "Step counter was not running before " + action + " — skipping restart");
            return;
        }

        int goal = prefs.getInt(KEY_GOAL, 10000);

        // Restore today's step count so the service continues from where it
        // left off. If the saved date is a previous day, start fresh (0).
        String today     = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        String savedDate = prefs.getString(KEY_DATE, "");
        int    initialSteps = today.equals(savedDate) ? prefs.getInt(KEY_SAVED_STEPS, 0) : 0;

        Log.d(TAG, "Restarting StepCounterService after " + action
                + " | goal=" + goal + " initialSteps=" + initialSteps);

        Intent svc = new Intent(context, StepCounterService.class);
        svc.putExtra(StepCounterService.EXTRA_START_GOAL,    goal);
        svc.putExtra(StepCounterService.EXTRA_INITIAL_STEPS, initialSteps);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(svc);
        } else {
            context.startService(svc);
        }
    }
}
