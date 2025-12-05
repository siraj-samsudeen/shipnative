import { ReactNode } from "react"
import * as Sentry from "@sentry/react-native"

import { ErrorDetails } from "./ErrorDetails"

interface Props {
  children: ReactNode
  catchErrors: "always" | "dev" | "prod" | "never"
}

/**
 * ErrorBoundary component using Sentry's built-in ErrorBoundary
 * with custom fallback UI (ErrorDetails component).
 * 
 * Sentry.ErrorBoundary automatically captures errors to Sentry,
 * so we don't need to manually call captureException.
 * 
 * @see [Sentry ErrorBoundary]{@link https://docs.sentry.io/platforms/react-native/features/react-error-boundary/}
 */
export function ErrorBoundary({ children, catchErrors }: Props) {
  // Only enable if we're catching errors in the right environment
  const isEnabled =
    catchErrors === "always" ||
    (catchErrors === "dev" && __DEV__) ||
    (catchErrors === "prod" && !__DEV__)

  if (!isEnabled || catchErrors === "never") {
    return <>{children}</>
  }

  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorDetails
          error={error}
          errorInfo={null}
          onReset={resetError}
        />
      )}
      beforeCapture={(scope, error, errorInfo) => {
        // Add custom tags for error boundary errors
        scope.setTag("errorBoundary", "true")
        scope.setTag("errorType", "react_component_error")
        if (errorInfo?.componentStack) {
          scope.setExtra("componentStack", errorInfo.componentStack)
        }
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  )
}
