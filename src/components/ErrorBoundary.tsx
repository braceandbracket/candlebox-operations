import React from "react";
import { AttentionBox } from "@vibe/core";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    // Keep this log so production telemetry can be added without changing the boundary contract.
    console.error("Unhandled React error in board view", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <AttentionBox
          type="danger"
          title="Something went wrong"
          text="Please refresh the board view. If the issue persists, contact support."
        />
      );
    }

    return this.props.children;
  }
}
