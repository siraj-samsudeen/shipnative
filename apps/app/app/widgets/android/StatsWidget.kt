//
//  StatsWidget.kt
//  Stats Widget for Shipnative
//
//  This widget displays user statistics from Supabase
//  in an Android home screen widget.
//

package com.reactnativestarterkit.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import android.util.Log
import org.json.JSONArray
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import java.text.SimpleDateFormat
import java.util.*

/**
 * Stats Widget Provider
 *
 * Displays user statistics from Supabase in a compact widget format.
 */
class StatsWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "StatsWidget"
        private const val PREFS_NAME = "widget_prefs"
        private const val SUPABASE_URL_KEY = "supabase_url"
        private const val SUPABASE_KEY_KEY = "supabase_key"
        private const val SESSION_TOKEN_KEY = "supabase_session_token"

        const val ACTION_REFRESH = "com.shipnative.statswidget.ACTION_REFRESH"
        const val EXTRA_WIDGET_ID = "stats_widget_id"

        private const val HTTP_TIMEOUT = 15000

        /**
         * Update widget with stats from Supabase
         */
        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

            val supabaseUrl = prefs.getString(SUPABASE_URL_KEY, null)
            val supabaseKey = prefs.getString(SUPABASE_KEY_KEY, null)
            val sessionToken = prefs.getString(SESSION_TOKEN_KEY, null)

            val views = RemoteViews(context.packageName, R.layout.stats_widget)

            // Set up click handlers
            setupClickHandlers(context, views, appWidgetId)

            if (supabaseUrl != null && supabaseKey != null) {
                fetchStatsData(supabaseUrl, supabaseKey, sessionToken) { result ->
                    when (result) {
                        is StatsResult.Success -> {
                            updateStatsViews(views, result.stats)

                            val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
                            views.setTextViewText(
                                R.id.stats_timestamp,
                                "Updated: ${timeFormat.format(Date())}"
                            )

                            views.setViewVisibility(R.id.stats_error, android.view.View.GONE)
                            views.setViewVisibility(R.id.stats_content, android.view.View.VISIBLE)
                        }
                        is StatsResult.Error -> {
                            views.setTextViewText(R.id.stats_error, result.error)
                            views.setViewVisibility(R.id.stats_error, android.view.View.VISIBLE)
                            views.setViewVisibility(R.id.stats_content, android.view.View.GONE)
                        }
                    }

                    appWidgetManager.updateAppWidget(appWidgetId, views)
                }
            } else {
                // Mock mode
                val mockStats = listOf(
                    StatItem("Tasks", "12", "green"),
                    StatItem("Streak", "5", "orange"),
                    StatItem("Points", "420", "yellow"),
                    StatItem("Level", "7", "blue")
                )
                updateStatsViews(views, mockStats)

                val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
                views.setTextViewText(
                    R.id.stats_timestamp,
                    "Updated: ${timeFormat.format(Date())}"
                )

                views.setViewVisibility(R.id.stats_error, android.view.View.GONE)
                views.setViewVisibility(R.id.stats_content, android.view.View.VISIBLE)

                appWidgetManager.updateAppWidget(appWidgetId, views)
            }
        }

        private fun updateStatsViews(views: RemoteViews, stats: List<StatItem>) {
            // Update up to 4 stat items
            val statViews = listOf(
                Triple(R.id.stat_1_container, R.id.stat_1_label, R.id.stat_1_value),
                Triple(R.id.stat_2_container, R.id.stat_2_label, R.id.stat_2_value),
                Triple(R.id.stat_3_container, R.id.stat_3_label, R.id.stat_3_value),
                Triple(R.id.stat_4_container, R.id.stat_4_label, R.id.stat_4_value)
            )

            statViews.forEachIndexed { index, (container, label, value) ->
                if (index < stats.size) {
                    val stat = stats[index]
                    views.setTextViewText(label, stat.label)
                    views.setTextViewText(value, stat.value)
                    views.setViewVisibility(container, android.view.View.VISIBLE)
                } else {
                    views.setViewVisibility(container, android.view.View.GONE)
                }
            }
        }

        private fun setupClickHandlers(
            context: Context,
            views: RemoteViews,
            appWidgetId: Int
        ) {
            // Refresh button
            val refreshIntent = Intent(context, StatsWidgetProvider::class.java).apply {
                action = ACTION_REFRESH
                putExtra(EXTRA_WIDGET_ID, appWidgetId)
            }
            val refreshPendingIntent = PendingIntent.getBroadcast(
                context,
                appWidgetId + 2000,
                refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.stats_refresh_button, refreshPendingIntent)

            // Main widget click - opens app
            val openAppIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            if (openAppIntent != null) {
                openAppIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                val openAppPendingIntent = PendingIntent.getActivity(
                    context,
                    appWidgetId + 3000,
                    openAppIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.stats_container, openAppPendingIntent)
            }
        }

        private fun fetchStatsData(
            supabaseUrl: String,
            supabaseKey: String,
            sessionToken: String?,
            callback: (StatsResult) -> Unit
        ) {
            Executors.newSingleThreadExecutor().execute {
                var connection: HttpURLConnection? = null
                try {
                    val endpoint = "$supabaseUrl/rest/v1/user_stats?select=label,value,color&order=sort_order.asc&limit=4"
                    val url = URL(endpoint)

                    connection = url.openConnection() as HttpURLConnection
                    connection.requestMethod = "GET"
                    connection.connectTimeout = HTTP_TIMEOUT
                    connection.readTimeout = HTTP_TIMEOUT

                    connection.setRequestProperty("apikey", supabaseKey)
                    connection.setRequestProperty("Accept", "application/json")
                    connection.setRequestProperty("Content-Type", "application/json")

                    if (!sessionToken.isNullOrEmpty()) {
                        connection.setRequestProperty("Authorization", "Bearer $sessionToken")
                    }

                    val responseCode = connection.responseCode

                    if (responseCode == HttpURLConnection.HTTP_OK) {
                        val reader = BufferedReader(InputStreamReader(connection.inputStream))
                        val response = StringBuilder()
                        var line: String?
                        while (reader.readLine().also { line = it } != null) {
                            response.append(line)
                        }
                        reader.close()

                        val jsonArray = JSONArray(response.toString())
                        val stats = mutableListOf<StatItem>()

                        for (i in 0 until jsonArray.length()) {
                            val obj = jsonArray.getJSONObject(i)
                            stats.add(StatItem(
                                label = obj.optString("label", "Stat"),
                                value = obj.optString("value", "0"),
                                color = obj.optString("color", "blue")
                            ))
                        }

                        if (stats.isEmpty()) {
                            stats.addAll(listOf(
                                StatItem("Tasks", "0", "green"),
                                StatItem("Streak", "0", "orange")
                            ))
                        }

                        callback(StatsResult.Success(stats))
                    } else {
                        Log.e(TAG, "HTTP Error: $responseCode")
                        callback(StatsResult.Error("Server error: $responseCode"))
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error fetching stats data", e)
                    callback(StatsResult.Error("Network error: ${e.localizedMessage}"))
                } finally {
                    connection?.disconnect()
                }
            }
        }
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        if (intent.action == ACTION_REFRESH) {
            val appWidgetId = intent.getIntExtra(EXTRA_WIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
            if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                Log.d(TAG, "Refresh clicked for stats widget $appWidgetId")
                val appWidgetManager = AppWidgetManager.getInstance(context)
                updateAppWidget(context, appWidgetManager, appWidgetId)
            }
        }
    }

    override fun onEnabled(context: Context) {
        Log.d(TAG, "Stats widget enabled")
    }

    override fun onDisabled(context: Context) {
        Log.d(TAG, "Stats widget disabled")
    }
}

/**
 * Stat item data model
 */
data class StatItem(
    val label: String,
    val value: String,
    val color: String = "blue"
)

/**
 * Stats result wrapper
 */
sealed class StatsResult {
    data class Success(val stats: List<StatItem>) : StatsResult()
    data class Error(val error: String) : StatsResult()
}
