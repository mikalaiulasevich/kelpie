import type { JSX, ComponentType, ReactNode } from 'react';

declare global {
  /** React-specific vocabulary belongs to the frontend compilation only. */
  type UIText = TextValue;
  type UIColor = ColorValue;
  type UIPercent = PercentValue;
  type UIPercentPair = PercentPairValue;
  type UIElement = JSX.Element;
  type UIComponent<Properties = object> = ComponentType<Properties>;
  type UINode = ReactNode;
  type UIChildren = UINode;
  type UIBooleanInput = Optional<boolean>;
  type UIStyleInput<Value> = Nullable<Value | false>;
  type UIActionResult = Awaitable<void>;
  type UIPropertiesWithChildren<Properties = object> = Properties & { children: UIChildren };
  type UITextPropertiesWithChildren<Properties = object> = Properties & { children: UIText };
  type UIOptionalTextPropertiesWithChildren<Properties = object> = Properties & {
    children?: UIText;
  };
  type UINoop = Noop;
}
