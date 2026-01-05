//
//  WidgetBundle.swift
//  Shipnative Widgets
//
//  Main entry point for all iOS widgets.
//  This file registers all available widgets with the system.
//

import WidgetKit
import SwiftUI

@main
struct ShipnativeWidgetBundle: WidgetBundle {
    var body: some Widget {
        ExampleWidget()
        StatsWidget()
    }
}
