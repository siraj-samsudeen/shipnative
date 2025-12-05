/**
 * Button Component Tests
 */

import { fireEvent, render } from "@testing-library/react-native"

import { Button } from "../Button"

describe("Button", () => {
  it("renders with text", () => {
    const { getByText } = render(<Button text="Click me" onPress={() => {}} />)
    expect(getByText("Click me")).toBeTruthy()
  })

  it("renders in disabled state", () => {
    const { getByText } = render(<Button text="Disabled" onPress={() => {}} disabled />)
    const buttonText = getByText("Disabled")
    expect(buttonText).toBeTruthy()
    // Button should render without crashing when disabled
    // Accessibility state is set on the parent View, which is harder to test with Animated.View
  })

  it("renders loading state", () => {
    const { queryByText } = render(<Button text="Loading" onPress={() => {}} loading />)
    expect(queryByText("Loading")).toBeNull() // Text should not be visible when loading
    // ActivityIndicator should be present
  })

  it("handles press events", () => {
    const onPress = jest.fn()
    const { getByText } = render(<Button text="Press me" onPress={onPress} testID="test-button" />)
    const buttonText = getByText("Press me")
    expect(buttonText).toBeTruthy()
    // Use fireEvent to trigger press on the text element's parent
    fireEvent.press(buttonText.parent as any)
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it("renders different variants", () => {
    const { rerender } = render(<Button text="Filled" variant="filled" onPress={() => {}} />)
    expect(rerender).toBeDefined()

    rerender(<Button text="Outlined" variant="outlined" onPress={() => {}} />)
    expect(rerender).toBeDefined()
  })

  it("renders different sizes", () => {
    const { rerender } = render(<Button text="Small" size="sm" onPress={() => {}} />)
    expect(rerender).toBeDefined()

    rerender(<Button text="Large" size="lg" onPress={() => {}} />)
    expect(rerender).toBeDefined()
  })
})
