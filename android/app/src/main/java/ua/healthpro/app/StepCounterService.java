package ua.healthpro.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Binder;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.core.app.NotificationCompat;

/**
 * Foreground Service for step counting.
 *
 * Uses Sensor.TYPE_STEP_COUNTER (hardware chip) — battery-efficient,
 * works even when WebView process is killed. Keeps a persistent notification
 * so Android OS guarantees the process stays alive.
 *
 * Architecture: ForegroundStepPlugin binds to this service and relays
 * step updates to JS via Capacitor notifyListeners("stepUpdate", data).
 */
public class StepCounterService extends Service implements SensorEventListener {

    public static final String TAG = "StepCounterService";

    // Notification channel (low importance → no sound, no heads-up)
    public static final String CHANNEL_ID      = "hp_step_counter";
    public static final int    NOTIF_ID        = 8001;

    // Broadcast sent to plugin on every step-count change
    public static final String ACTION_STEP_UPDATE = "ua.healthpro.app.STEP_UPDATE";
    public static final String EXTRA_STEPS        = "steps";
    public static final String EXTRA_GOAL         = "goal";

    // Extras passed to startService()
    public static final String EXTRA_START_GOAL   = "start_goal";
    public static final String EXTRA_NOTIF_TITLE  = "notif_title";
    public static final String EXTRA_NOTIF_TEXT   = "notif_text";

    private SensorManager sensorManager;
    private Sensor        stepCounterSensor;

    // Hardware counter value at service start; used to compute delta steps.
    private int  baselineSteps    = -1;
    private int  currentSteps     = 0;
    private int  dailyGoal        = 10000;
    private String notifTitle     = "HealthPro \uD83E\uDDB6";
    private String notifText      = "\u0420\u0430\u0445\u0443\u044e \u043a\u0440\u043e\u043a\u0438...";
    private boolean sensorAvailable = false;

    // Throttle: update notification every N steps to avoid battery drain
    private static final int NOTIF_THROTTLE_STEPS = 10;

    // Local binder for plugin access
    private final IBinder binder = new LocalBinder();

    public class LocalBinder extends Binder {
        public StepCounterService getService() { return StepCounterService.this; }
    }

    @Override
    public IBinder onBind(Intent intent) { return binder; }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        sensorManager = (SensorManager) getSystemService(SENSOR_SERVICE);
        if (sensorManager != null) {
            stepCounterSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
            sensorAvailable   = (stepCounterSensor != null);
        }
        if (!sensorAvailable) {
            Log.w(TAG, "TYPE_STEP_COUNTER hardware sensor not available on this device");
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            dailyGoal  = intent.getIntExtra(EXTRA_START_GOAL, 10000);
            String t   = intent.getStringExtra(EXTRA_NOTIF_TITLE);
            String txt = intent.getStringExtra(EXTRA_NOTIF_TEXT);
            if (t   != null && !t.isEmpty())   notifTitle = t;
            if (txt != null && !txt.isEmpty()) notifText  = txt;
        }

        startForeground(NOTIF_ID, buildNotification(currentSteps, dailyGoal));

        if (sensorAvailable) {
            sensorManager.registerListener(
                    this, stepCounterSensor, SensorManager.SENSOR_DELAY_NORMAL);
        }
        return START_STICKY;
    }

    // ── SensorEventListener ─────────────────────────────────────────────────

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() != Sensor.TYPE_STEP_COUNTER) return;

        int rawSteps = (int) event.values[0];

        // First event: establish baseline.
        // TYPE_STEP_COUNTER is a cumulative hardware counter that resets only
        // on reboot — we subtract the value at service start to get session steps.
        if (baselineSteps < 0) {
            baselineSteps = rawSteps;
        }
        currentSteps = rawSteps - baselineSteps;

        // Throttle notification refresh
        if (currentSteps % NOTIF_THROTTLE_STEPS == 0) {
            updateNotification(currentSteps, dailyGoal);
        }

        broadcastStepUpdate(currentSteps);
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) { /* no-op */ }

    // ── Public API (called by ForegroundStepPlugin via LocalBinder) ──────────

    public int  getStepCount()       { return currentSteps; }
    public boolean isSensorAvailable() { return sensorAvailable; }

    public void setGoal(int goal) {
        this.dailyGoal = goal;
        updateNotification(currentSteps, goal);
    }

    // ── Internal helpers ─────────────────────────────────────────────────────

    private void broadcastStepUpdate(int steps) {
        Intent i = new Intent(ACTION_STEP_UPDATE);
        i.putExtra(EXTRA_STEPS, steps);
        i.putExtra(EXTRA_GOAL,  dailyGoal);
        sendBroadcast(i);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID,
                    "\u041a\u0440\u043e\u043a\u043e\u043c\u0456\u0440",          // "Крокомір"
                    NotificationManager.IMPORTANCE_LOW                             // silent, no heads-up
            );
            ch.setDescription("\u041f\u0456\u0434\u0440\u0430\u0445\u0443\u043d\u043e\u043a \u043a\u0440\u043e\u043a\u0456\u0432 \u0443 \u0444\u043e\u043d\u043e\u0432\u043e\u043c\u0443 \u0440\u0435\u0436\u0438\u043c\u0456");
            ch.setShowBadge(false);
            ch.setSound(null, null);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(ch);
        }
    }

    private Notification buildNotification(int steps, int goal) {
        Intent launchIntent = new Intent(this, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);

        int piFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                ? PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
                : PendingIntent.FLAG_UPDATE_CURRENT;
        PendingIntent pi = PendingIntent.getActivity(this, 0, launchIntent, piFlags);

        String progressText = steps + " / " + goal + " \u043a\u0440\u043e\u043a\u0456\u0432";
        int pct = (goal > 0) ? Math.min(100, steps * 100 / goal) : 0;

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(notifTitle)
                .setContentText(progressText)
                .setSmallIcon(R.drawable.ic_stat_notification)
                .setContentIntent(pi)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setSilent(true)
                .setProgress(100, pct, false)
                .setPriority(NotificationCompat.PRIORITY_LOW);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            builder.setForegroundServiceBehavior(
                    NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE);
        }
        return builder.build();
    }

    private void updateNotification(int steps, int goal) {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIF_ID, buildNotification(steps, goal));
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (sensorManager != null) {
            sensorManager.unregisterListener(this);
        }
    }
}
