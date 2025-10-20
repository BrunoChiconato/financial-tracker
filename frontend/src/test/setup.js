/**
 * Test Setup Configuration
 *
 * Configures the testing environment with necessary utilities and matchers.
 * Sets up @testing-library/jest-dom matchers for enhanced assertions.
 */
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});
