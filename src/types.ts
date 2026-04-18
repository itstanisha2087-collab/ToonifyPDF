/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CartoonScene {
  title: string;
  narration: string;
  visualPrompt: string;
  image?: string;
  videoUrl?: string;
}

export interface CartoonStory {
  title: string;
  scenes: CartoonScene[];
}
