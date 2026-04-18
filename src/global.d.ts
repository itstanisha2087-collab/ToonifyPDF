/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

interface Window {
  aistudio: AIStudio;
}
