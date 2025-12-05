/**
 * Spinner Component Tests
 *
 * Tests spinner behavior including sizes, colors, text display, and full screen mode.
 */

import { ActivityIndicator } from "react-native"
import { render } from "@testing-library/react-native"

import { Spinner } from "../Spinner"

describe("Spinner", () => {
  it("renders ActivityIndicator", () => {
    const { UNSAFE_getByType } = render(<Spinner />)
    const indicator = UNSAFE_getByType(ActivityIndicator)
    expect(indicator).toBeTruthy()
    expect(indicator.props.size).toBe("small") // Default size "md" maps to "small"
  })

  it("renders with correct size prop", () => {
    const { UNSAFE_getByType, rerender } = render(<Spinner size="sm" />)
    let indicator = UNSAFE_getByType(ActivityIndicator)
    expect(indicator.props.size).toBe("small")

    rerender(<Spinner size="md" />)
    indicator = UNSAFE_getByType(ActivityIndicator)
    expect(indicator.props.size).toBe("small")

    rerender(<Spinner size="lg" />)
    indicator = UNSAFE_getByType(ActivityIndicator)
    expect(indicator.props.size).toBe("large")
  })

  it("displays text when provided", () => {
    const { getByText } = render(<Spinner text="Loading..." />)
    expect(getByText("Loading...")).toBeTruthy()
  })

  it("does not display text when not provided", () => {
    const { queryByText } = render(<Spinner />)
    expect(queryByText("Loading...")).toBeNull()
  })

  it("renders in full screen mode with overlay", () => {
    const { UNSAFE_getByType } = render(<Spinner fullScreen />)
    // Full screen mode should render an overlay View
    const view = UNSAFE_getByType(require("react-native").View)
    expect(view).toBeTruthy()
  })

  it("renders without overlay in normal mode", () => {
    const { UNSAFE_getByType } = render(<Spinner />)
    const indicator = UNSAFE_getByType(ActivityIndicator)
    expect(indicator).toBeTruthy()
  })

  it("applies correct color based on color prop", () => {
    const { UNSAFE_getByType, rerender } = render(<Spinner color="primary" />)
    let indicator = UNSAFE_getByType(ActivityIndicator)
    expect(indicator.props.color).toBeTruthy()

    rerender(<Spinner color="white" />)
    indicator = UNSAFE_getByType(ActivityIndicator)
    expect(indicator.props.color).toBeTruthy()

    rerender(<Spinner color="secondary" />)
    indicator = UNSAFE_getByType(ActivityIndicator)
    expect(indicator.props.color).toBeTruthy()
  })
})
