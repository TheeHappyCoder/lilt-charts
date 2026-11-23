/**
 * Every Component in one place, for the docs site and the tests. Registry items never import
 * this file: each one copies only the files it uses.
 */
export { ProviderLogo, PROVIDERS, type ProviderId } from './provider-logos';
export {
  ConnectButton,
  LogoTriad,
  PROVIDER_MARKS,
  type ConnectButtonProps,
  type LogoTriadProps,
  type TriadLogo,
} from './connect-button';
export { PixelGrid, Thinking, type PixelPattern, type ThinkingProps } from './thinking';
export {
  PILL_STATES,
  StatusPill,
  type PillState,
  type PillStatus,
  type StatusPillProps,
} from './status-pill';
export { Presence, type Person, type PresenceProps } from './presence';
export { HoldToConfirm, type HoldToConfirmProps } from './hold-to-confirm';
export { CommandCopy, type CommandCopyProps } from './command-copy';
export { NumberRoll, type NumberRollProps } from './number-roll';
export { StreamText, type StreamTextProps } from './stream-text';
export {
  formatDuration,
  ToolTrace,
  type StepStatus,
  type ToolTraceProps,
  type TraceStep,
} from './tool-trace';

export {
  ProfilePhoto,
  type ProfilePhotoHandle,
  type ProfilePhotoProps,
  type SavedPhoto,
} from './profile-photo';

export {
  DateRange,
  type DateRangePreset,
  type DateRangeProps,
  type DateRangeValue,
} from './date-range';

export { StatusPillDemo } from './demos/status-pill-demo';
export { DateRangeDemo } from './demos/date-range-demo';
export { ProfilePhotoDemo } from './demos/profile-photo-demo';
export { NumberRollDemo } from './demos/number-roll-demo';
export { StreamTextDemo } from './demos/stream-text-demo';
export { ToolTraceDemo } from './demos/tool-trace-demo';
