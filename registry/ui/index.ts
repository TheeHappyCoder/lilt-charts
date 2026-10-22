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

export { StatusPillDemo } from './demos/status-pill-demo';
