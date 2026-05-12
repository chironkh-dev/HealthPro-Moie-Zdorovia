package ua.healthpro.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.SharedPreferences;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Binder;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Foreground Service for step counting.
 *
 * Uses Sensor.TYPE_STEP_COUNTER (hardware chip) — battery-efficient,
 * works even when WebView process is killed. Keeps a persistent notification
 * so Android OS guarantees the process stays alive.
 *
 * Bug-fix (sync):
 *   Accepts EXTRA_INITIAL_STEPS so the service's broadcast always sends the
 *   full daily step count (initialSteps + session delta), not just the delta
 *   since service start. This fixes the notification ≠ app count mismatch.
 *
 * Resilience:
 *   - START_STICKY  : OS restarts service after low-memory kill.
 *   - onTaskRemoved : schedules AlarmManager restart after swipe-kill.
 *   - SharedPrefs   : persists running state + last step count for BootReceiver.
 */
public class StepCounterService extends Service implements SensorEventListener {

    public static final String TAG = "StepCounterService";

    public static final String CHANNEL_ID      = "hp_step_counter";
    public static final int    NOTIF_ID        = 8001;

    public static final String ACTION_STEP_UPDATE = "ua.healthpro.app.STEP_UPDATE";
    public static final String EXTRA_STEPS        = "steps";
    public static final String EXTRA_GOAL         = "goal";

    public static final String EXTRA_START_GOAL   = "start_goal";
    public static final String EXTRA_NOTIF_TITLE  = "notif_title";
    public static final String EXTRA_NOTIF_TEXT   = "notif_text";
    /** Daily steps already counted before this service session started. */
    public static final String EXTRA_INITIAL_STEPS = "initial_steps";

    private SensorManager sensorManager;
    private Sensor        stepCounterSensor;

    private int  baselineSteps  = -1;
    private int  initialSteps   = 0;      // steps from DB before service started
    private int  currentSteps   = 0;      // total daily steps (initial + session)
    private int  dailyGoal      = 10000;
    private String currentDate  = "";     // for midnight rollover detection
    private String notifTitle   = "HealthPro";
    private String notifText    = "\u0420\u0430\u0445\u0443\u044e \u043a\u0440\u043e\u043a\u0438...";
    private boolean sensorAvailable = false;


    private final IBinder binder = new LocalBinder();

    public class LocalBinder extends Binder {
        public StepCounterService getService() { return StepCounterService.this; }
    }

    @Override public IBinder onBind(Intent intent) { return binder; }

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
            Log.w(TAG, "TYPE_STEP_COUNTER not available on this device");
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            dailyGoal     = intent.getIntExtra(EXTRA_START_GOAL,   10000);
            initialSteps  = intent.getIntExtra(EXTRA_INITIAL_STEPS, 0);
            // Allow refreshing goal/title/text when called from saveStepGoal()
            String t   = intent.getStringExtra(EXTRA_NOTIF_TITLE);
            String txt = intent.getStringExtra(EXTRA_NOTIF_TEXT);
            if (t   != null && !t.isEmpty())   notifTitle = t;
            if (txt != null && !txt.isEmpty()) notifText  = txt;
        }

        // Re-seed currentSteps on every (re)start so UI is consistent immediately.
        currentSteps = initialSteps;
        // Reset baseline so the first sensor event re-establishes the reference.
        baselineSteps = -1;
        // Ініціалізуємо поточну дату для виявлення переходу опівночі.
        currentDate = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());

        startForeground(NOTIF_ID, buildNotification(currentSteps, dailyGoal));
        saveRunningState(true);

        if (sensorAvailable) {
            sensorManager.unregisterListener(this); // avoid duplicate registration
            sensorManager.registerListener(
                    this, stepCounterSensor, SensorManager.SENSOR_DELAY_NORMAL);
        }
        return START_STICKY;
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() != Sensor.TYPE_STEP_COUNTER) return;

        int rawSteps = (int) event.values[0];

        // Захист від переходу опівночі: якщо JS-шар недоступний (сервіс живий, app вимкнений),
        // сервіс сам скидає лічильник при зміні дати.
        String nowDate = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        if (!currentDate.isEmpty() && !nowDate.equals(currentDate)) {
            Log.d(TAG, "Midnight rollover detected in service: " + currentDate + " → " + nowDate);
            currentDate   = nowDate;
            initialSteps  = 0;
            currentSteps  = 0;
            baselineSteps = rawSteps;  // новий baseline — щоб delta стартувала з 0
            broadcastStepUpdate(0);
            updateNotification(0, dailyGoal);
            saveStepState(0);
            saveRunningState(true);
            return;
        }

        if (baselineSteps < 0) {
            // First event after (re)start — establish delta baseline.
            // TYPE_STEP_COUNTER is cumulative since last boot, so we only
            // care about the delta from this moment forward.
            baselineSteps = rawSteps;
        }

        currentSteps = (rawSteps - baselineSteps) + initialSteps;

        updateNotification(currentSteps, dailyGoal);
        if (currentSteps % 20 == 0) {
            saveStepState(currentSteps);
        }

        broadcastStepUpdate(currentSteps);
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}

    // ── Public API (called by ForegroundStepPlugin via LocalBinder) ──────────

    public int     getStepCount()       { return currentSteps; }
    public boolean isSensorAvailable()  { return sensorAvailable; }

    public void setGoal(int goal) {
        this.dailyGoal = goal;
        updateNotification(currentSteps, goal);
        saveRunningState(true);
    }

    // ── Resilience ───────────────────────────────────────────────────────────

    /**
     * When the user swipes the app from recents, schedule an AlarmManager
     * one-shot to restart the service 1 second later. The service keeps
     * counting steps even if the Activity is gone (START_STICKY also helps,
     * but onTaskRemoved gives us an extra safety net on Samsung One UI).
     */
    @Override
    public void onTaskRemoved(Intent rootIntent) {
        Log.d(TAG, "onTaskRemoved — scheduling restart");
        saveStepState(currentSteps);
        saveRunningState(true);

        Intent restartIntent = new Intent(getApplicationContext(), StepCounterService.class);
        restartIntent.putExtra(EXTRA_START_GOAL,    dailyGoal);
        restartIntent.putExtra(EXTRA_INITIAL_STEPS, currentSteps);

        int piFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                ? PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_ONE_SHOT
                : PendingIntent.FLAG_ONE_SHOT;

        PendingIntent pi = PendingIntent.getService(
                getApplicationContext(), 1, restartIntent, piFlags);

        AlarmManager am = (AlarmManager) getSystemService(ALARM_SERVICE);
        if (am != null) {
            am.set(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + 1000, pi);
        }
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (sensorManager != null) sensorManager.unregisterListener(this);
        // Only clear was_running if WE decided to stop (stopService from JS).
        // onTaskRemoved already saved true before this is reached in kill scenarios.
    }

    // ── SharedPreferences helpers ─────────────────────────────────────────────

    private void saveRunningState(boolean running) {
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        getSharedPreferences(BootReceiver.PREFS_NAME, MODE_PRIVATE)
                .edit()
                .putBoolean(BootReceiver.KEY_WAS_RUNNING, running)
                .putInt(BootReceiver.KEY_GOAL, dailyGoal)
                .putString(BootReceiver.KEY_DATE, today)
                .apply();
    }

    private void saveStepState(int steps) {
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        getSharedPreferences(BootReceiver.PREFS_NAME, MODE_PRIVATE)
                .edit()
                .putInt(BootReceiver.KEY_SAVED_STEPS, steps)
                .putString(BootReceiver.KEY_DATE, today)
                .apply();
    }

    void clearRunningState() {
        getSharedPreferences(BootReceiver.PREFS_NAME, MODE_PRIVATE)
                .edit()
                .putBoolean(BootReceiver.KEY_WAS_RUNNING, false)
                .apply();
    }

    // ── Broadcast / Notification ──────────────────────────────────────────────

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
                    "\u041a\u0440\u043e\u043a\u043e\u043c\u0456\u0440",
                    NotificationManager.IMPORTANCE_LOW
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

        int pct = (goal > 0) ? Math.min(100, steps * 100 / goal) : 0;

        // Формат: "4 235 / 10 000 кроків (42%)"
        String stepsFormatted = String.format(new java.util.Locale("uk"), "%,d", steps)
                .replace(',', '\u00a0');  // пробіл як роздільник тисяч
        String goalFormatted  = String.format(new java.util.Locale("uk"), "%,d", goal)
                .replace(',', '\u00a0');
        String progressText   = stepsFormatted + " / " + goalFormatted
                + " \u043a\u0440\u043e\u043a\u0456\u0432 (" + pct + "%)";

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(notifTitle)
                .setContentText(progressText)
                // Використовуємо іконку бігуна замість ноги
                .setSmallIcon(R.drawable.ic_stat_running)
                .setContentIntent(pi)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setSilent(true)
                // Полоска прибрана — використовуємо розгорнутий текст
                .setStyle(new NotificationCompat.BigTextStyle()
                        .bigText(progressText))
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
}
