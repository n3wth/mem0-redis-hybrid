import React, { useState, useEffect } from "react";
import { Text } from "ink";

const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

interface SpinnerProps {
  type?: string;
}

export const SimpleSpinner: React.FC<SpinnerProps> = () => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % frames.length);
    }, 80);

    return () => clearInterval(interval);
  }, []);

  return <Text color="cyan">{frames[frame]}</Text>;
};

export default SimpleSpinner;
