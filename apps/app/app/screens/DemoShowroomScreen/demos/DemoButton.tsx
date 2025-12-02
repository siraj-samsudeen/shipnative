/* eslint-disable react/jsx-key */
import { ImageStyle, TextStyle, ViewStyle } from "react-native"

import { Button } from "@/components/Button"
import { Icon } from "@/components/Icon"
import { Text } from "@/components/Text"
import { translate } from "@/i18n/translate"
import type { ThemedStyle } from "@/theme/types"

import { DemoDivider } from "../DemoDivider"
import { Demo } from "./types"
import { DemoUseCase } from "../DemoUseCase"

const $iconStyle: ImageStyle = { width: 30, height: 30 }
// These styles are examples for future use in the demo
const _$customButtonStyle: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.error,
  height: 100,
})
const _$customButtonPressedStyle: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.error,
})
const _$customButtonTextStyle: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  color: colors.error,
  fontFamily: typography.primary.bold,
  textDecorationLine: "underline",
  textDecorationColor: colors.error,
})
const _$customButtonPressedTextStyle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
})
const _$customButtonRightAccessoryStyle: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: "53%",
  height: "200%",
  backgroundColor: colors.error,
  position: "absolute",
  top: 0,
  right: 0,
})
const _$customButtonPressedRightAccessoryStyle: ThemedStyle<ImageStyle> = ({ colors }) => ({
  tintColor: colors.palette.neutral100,
})

const _$disabledOpacity: ViewStyle = { opacity: 0.5 }
const _$disabledButtonTextStyle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
  textDecorationColor: colors.palette.neutral100,
})

export const DemoButton: Demo = {
  name: "Button",
  description: "demoButton:description",
  data: () => [
    <DemoUseCase
      name="demoButton:useCase.presets.name"
      description="demoButton:useCase.presets.description"
    >
      <Button text="Default - Laboris In Labore" />
      <DemoDivider />

      <Button variant="filled" text="Filled - Laboris Ex" />
      <DemoDivider />

      <Button variant="danger" text="Reversed - Ad Ipsum" />
    </DemoUseCase>,
    <DemoUseCase
      name="demoButton:useCase.passingContent.name"
      description="demoButton:useCase.passingContent.description"
    >
      <Button text={translate("demoButton:useCase.passingContent.viaTextProps")} />
      <DemoDivider />

      <Button tx="demoShowroomScreen:demoViaTxProp" />
      <DemoDivider />

      <Button>{translate("demoButton:useCase.passingContent.children")}</Button>
      <DemoDivider />

      <Button
        variant="filled"
        RightAccessory={(props) => (
          <Icon containerStyle={props.style} style={$iconStyle} icon="ladybug" />
        )}
      >
        {translate("demoButton:useCase.passingContent.rightAccessory")}
      </Button>
      <DemoDivider />

      <Button
        variant="filled"
        LeftAccessory={(props) => (
          <Icon containerStyle={props.style} style={$iconStyle} icon="ladybug" />
        )}
      >
        {translate("demoButton:useCase.passingContent.leftAccessory")}
      </Button>
      <DemoDivider />

      <Button>
        <Text>
          <Text preset="bold">{translate("demoButton:useCase.passingContent.nestedChildren")}</Text>
          {` `}
          <Text preset="default">
            {translate("demoButton:useCase.passingContent.nestedChildren2")}
          </Text>
          {` `}
          <Text preset="bold">
            {translate("demoButton:useCase.passingContent.nestedChildren3")}
          </Text>
        </Text>
      </Button>
      <DemoDivider />

      <Button
        variant="danger"
        RightAccessory={(props) => (
          <Icon containerStyle={props.style} style={$iconStyle} icon="ladybug" />
        )}
        LeftAccessory={(props) => (
          <Icon containerStyle={props.style} style={$iconStyle} icon="ladybug" />
        )}
      >
        {translate("demoButton:useCase.passingContent.multiLine")}
      </Button>
    </DemoUseCase>,
  ],
}

// @demo remove-file
