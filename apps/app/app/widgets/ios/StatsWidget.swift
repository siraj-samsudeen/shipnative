//
//  StatsWidget.swift
//  Stats Widget for Shipnative
//
//  This widget displays user statistics from Supabase
//  in a compact iOS widget using SwiftUI.
//

import WidgetKit
import SwiftUI

// MARK: - Widget Entry

struct StatsWidgetEntry: TimelineEntry {
    let date: Date
    let stats: [StatItem]
    let error: String?

    struct StatItem {
        let label: String
        let value: String
        let icon: String
        let color: Color
    }

    static var placeholder: StatsWidgetEntry {
        StatsWidgetEntry(
            date: Date(),
            stats: [
                StatItem(label: "Tasks", value: "12", icon: "checkmark.circle.fill", color: .green),
                StatItem(label: "Streak", value: "5", icon: "flame.fill", color: .orange),
                StatItem(label: "Points", value: "420", icon: "star.fill", color: .yellow),
            ],
            error: nil
        )
    }

    static var error: StatsWidgetEntry {
        StatsWidgetEntry(
            date: Date(),
            stats: [],
            error: "Unable to load stats"
        )
    }
}

// MARK: - Timeline Provider

struct StatsWidgetProvider: TimelineProvider {
    private let appGroupIdentifier: String = {
        if let explicit = Bundle.main.object(forInfoDictionaryKey: "APP_GROUP_IDENTIFIER") as? String, !explicit.isEmpty {
            return explicit
        }
        if let bundleId = Bundle.main.bundleIdentifier {
            let parts = bundleId.split(separator: ".")
            if parts.count > 2 {
                let baseId = parts.dropLast().joined(separator: ".")
                return "group.\(baseId)"
            } else {
                return "group.\(bundleId)"
            }
        }
        return "group.com.shipnative.app"
    }()

    private let supabaseUrlKey = "supabase_url"
    private let supabaseKeyKey = "supabase_key"
    private let sessionTokenKey = "supabase_session_token"

    func placeholder(in context: Context) -> StatsWidgetEntry {
        return StatsWidgetEntry.placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (StatsWidgetEntry) -> Void) {
        completion(StatsWidgetEntry.placeholder)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<StatsWidgetEntry>) -> Void) {
        fetchStats { entry in
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
            let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
            completion(timeline)
        }
    }

    // MARK: - Data Fetching

    private func fetchStats(completion: @escaping (StatsWidgetEntry) -> Void) {
        guard let userDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
            completion(StatsWidgetEntry.error)
            return
        }

        guard let supabaseUrl = userDefaults.string(forKey: supabaseUrlKey),
              let supabaseKey = userDefaults.string(forKey: supabaseKeyKey) else {
            // Mock mode
            completion(StatsWidgetEntry.placeholder)
            return
        }

        let sessionToken = userDefaults.string(forKey: sessionTokenKey)

        fetchFromSupabase(url: supabaseUrl, key: supabaseKey, token: sessionToken) { result in
            switch result {
            case .success(let stats):
                let entry = StatsWidgetEntry(date: Date(), stats: stats, error: nil)
                completion(entry)
            case .failure(let error):
                let entry = StatsWidgetEntry(
                    date: Date(),
                    stats: [],
                    error: error.localizedDescription
                )
                completion(entry)
            }
        }
    }

    private func fetchFromSupabase(
        url: String,
        key: String,
        token: String?,
        completion: @escaping (Result<[StatsWidgetEntry.StatItem], Error>) -> Void
    ) {
        guard let endpoint = URL(string: "\(url)/rest/v1/user_stats?select=label,value,icon,color&order=sort_order.asc&limit=4") else {
            completion(.failure(URLError(.badURL)))
            return
        }

        var request = URLRequest(url: endpoint, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 15)
        request.httpMethod = "GET"
        request.setValue(key, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if let token = token, !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }

            guard let data = data else {
                completion(.failure(URLError(.badServerResponse)))
                return
            }

            do {
                let decoder = JSONDecoder()
                decoder.keyDecodingStrategy = .convertFromSnakeCase
                let entries = try decoder.decode([SupabaseStatEntry].self, from: data)

                let stats = entries.map { entry in
                    StatsWidgetEntry.StatItem(
                        label: entry.label ?? "Stat",
                        value: entry.value ?? "0",
                        icon: entry.icon ?? "circle.fill",
                        color: colorFromString(entry.color)
                    )
                }

                completion(.success(stats.isEmpty ? defaultStats() : stats))
            } catch {
                completion(.failure(error))
            }
        }

        task.resume()
    }

    private func colorFromString(_ colorString: String?) -> Color {
        switch colorString?.lowercased() {
        case "green": return .green
        case "orange": return .orange
        case "yellow": return .yellow
        case "blue": return .blue
        case "red": return .red
        case "purple": return .purple
        case "pink": return .pink
        default: return .blue
        }
    }

    private func defaultStats() -> [StatsWidgetEntry.StatItem] {
        return [
            StatsWidgetEntry.StatItem(label: "Tasks", value: "0", icon: "checkmark.circle.fill", color: .green),
            StatsWidgetEntry.StatItem(label: "Streak", value: "0", icon: "flame.fill", color: .orange),
        ]
    }
}

// MARK: - Supabase Models

private struct SupabaseStatEntry: Decodable {
    let label: String?
    let value: String?
    let icon: String?
    let color: String?
}

// MARK: - Widget View

struct StatsWidgetView: View {
    var entry: StatsWidgetProvider.Entry
    @Environment(\.widgetFamily) var family

    private let primaryColor = Color(red: 0.2, green: 0.4, blue: 0.8)
    private let backgroundColor = Color(red: 0.95, green: 0.95, blue: 0.97)
    private let textColor = Color(red: 0.1, green: 0.1, blue: 0.1)

    var body: some View {
        ZStack {
            backgroundColor

            if let error = entry.error {
                VStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.red)
                        .font(.title2)
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                        .multilineTextAlignment(.center)
                }
                .padding()
            } else {
                switch family {
                case .systemSmall:
                    smallWidget
                case .systemMedium:
                    mediumWidget
                default:
                    smallWidget
                }
            }
        }
    }

    private var smallWidget: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Stats")
                .font(.headline)
                .foregroundColor(textColor)

            Spacer()

            ForEach(Array(entry.stats.prefix(2).enumerated()), id: \.offset) { _, stat in
                HStack(spacing: 6) {
                    Image(systemName: stat.icon)
                        .foregroundColor(stat.color)
                        .font(.caption)
                    Text(stat.label)
                        .font(.caption2)
                        .foregroundColor(textColor.opacity(0.7))
                    Spacer()
                    Text(stat.value)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(primaryColor)
                }
            }

            Spacer()

            Text("Updated: \(entry.date, style: .time)")
                .font(.system(size: 9))
                .foregroundColor(textColor.opacity(0.5))
        }
        .padding()
    }

    private var mediumWidget: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Your Stats")
                    .font(.headline)
                    .foregroundColor(textColor)
                Spacer()
                Text("Updated: \(entry.date, style: .time)")
                    .font(.system(size: 10))
                    .foregroundColor(textColor.opacity(0.5))
            }

            Spacer()

            HStack(spacing: 16) {
                ForEach(Array(entry.stats.prefix(4).enumerated()), id: \.offset) { _, stat in
                    VStack(spacing: 4) {
                        Image(systemName: stat.icon)
                            .foregroundColor(stat.color)
                            .font(.title2)
                        Text(stat.value)
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundColor(textColor)
                        Text(stat.label)
                            .font(.caption2)
                            .foregroundColor(textColor.opacity(0.7))
                    }
                    .frame(maxWidth: .infinity)
                }
            }

            Spacer()
        }
        .padding()
    }
}

// MARK: - Widget Configuration

struct StatsWidget: Widget {
    let kind: String = "StatsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StatsWidgetProvider()) { entry in
            StatsWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Stats Widget")
        .description("View your statistics at a glance")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Preview

#Preview(as: .systemSmall) {
    StatsWidget()
} timeline: {
    StatsWidgetEntry.placeholder
    StatsWidgetEntry.error
}

#Preview(as: .systemMedium) {
    StatsWidget()
} timeline: {
    StatsWidgetEntry.placeholder
}
