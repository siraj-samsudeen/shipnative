/**
 * TextField Component Tests
 */

import { render, fireEvent } from "@testing-library/react-native"

import { TextField } from "../TextField"

describe("TextField", () => {
  it("renders with label", () => {
    const { getByText } = render(<TextField label="Email" />)
    expect(getByText("Email")).toBeTruthy()
  })

  it("handles text input", () => {
    const onChangeText = jest.fn()
    const { getByPlaceholderText } = render(
      <TextField placeholder="Enter email" onChangeText={onChangeText} />,
    )
    const input = getByPlaceholderText("Enter email")
    fireEvent.changeText(input, "test@example.com")
    expect(onChangeText).toHaveBeenCalledWith("test@example.com")
  })

  it("shows error state", () => {
    const { getByText } = render(<TextField label="Email" status="error" helper="Invalid email" />)
    expect(getByText("Invalid email")).toBeTruthy()
  })

  it("renders in disabled state", () => {
    const { getByPlaceholderText } = render(<TextField placeholder="Disabled" editable={false} />)
    const input = getByPlaceholderText("Disabled")
    expect(input.props.editable).toBe(false)
  })
})


