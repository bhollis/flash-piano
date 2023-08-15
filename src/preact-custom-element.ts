/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Attributes,
  ClassAttributes,
  ComponentChildren,
  ComponentType,
  Ref,
  VNode,
  cloneElement,
  h,
  hydrate,
  render,
} from 'preact';

// adoptStylesheets ripped from lit ReactiveElement, the rest forked from preact-custom-element

/**
 * Whether the current browser supports `adoptedStyleSheets`.
 */
export const supportsAdoptingStyleSheets: boolean =
  window.ShadowRoot &&
  'adoptedStyleSheets' in Document.prototype &&
  'replace' in CSSStyleSheet.prototype;

export default function register<P>(
  Component: ComponentType<P>,
  tagName: string,
  propNames: string[],
  css: string,
) {
  let styleSheet: CSSStyleSheet | undefined;
  const adoptStyles = supportsAdoptingStyleSheets
    ? (renderRoot: ShadowRoot) => {
        // Build the constructible stylesheet once, on demand
        if (styleSheet === undefined) {
          (styleSheet = new CSSStyleSheet()).replaceSync(css);
        }
        renderRoot.adoptedStyleSheets = [styleSheet];
      }
    : (renderRoot: ShadowRoot) => {
        // Rely on browsers having an optimization for duplicate styles
        const style = document.createElement('style');

        /*
      const nonce = (global as any).litNonce;
      if (nonce !== undefined) {
        style.setAttribute('nonce', nonce);
      }
      */
        style.textContent = css;
        renderRoot.appendChild(style);
      };

  class PreactElement extends HTMLElement {
    private _vdomComponent: ComponentType<P>;
    private _root: ShadowRoot;
    private _vdom: VNode<ComponentType<P>> | null = null;
    private _props: Record<string, unknown> = {};

    public observedAttributes: string[];

    constructor() {
      super();
      this._vdomComponent = Component;
      this._root = this.attachShadow({ mode: 'closed' });
      this.observedAttributes = propNames;

      // Keep DOM properties and Preact props in sync
      for (const name of propNames) {
        Object.defineProperty(PreactElement.prototype, name, {
          get(this: PreactElement): string {
            // @ts-expect-error ts(7053)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return this._vdom.props[name];
          },
          set(this: PreactElement, v: string) {
            if (this._vdom) {
              this.attributeChangedCallback(name, null, v);
            } else {
              if (!this._props) {
                this._props = {};
              }

              this._props[name] = v;
              this.connectedCallback();
            }

            // Reflect property changes to attributes if the value is a primitive
            const type = typeof v;
            if (v === null || type === 'string' || type === 'boolean' || type === 'number') {
              this.setAttribute(name, v.toString());
            }
          },
        });
      }
    }

    connectedCallback() {
      // Obtain a reference to the previous context by pinging the nearest
      // higher up node that was rendered with Preact. If one Preact component
      // higher up receives our ping, it will set the `detail` property of
      // our custom event. This works because events are dispatched
      // synchronously.
      const event = new CustomEvent<{ context?: unknown }>('_preact', {
        detail: {},
        bubbles: true,
        cancelable: true,
      });
      this.dispatchEvent(event);
      const context = event.detail.context;

      // @ts-expect-error ts(2322)
      this._vdom = h(
        ContextProvider,
        // @ts-expect-error ts(2769)
        { ...this._props, context },
        toVdom(this, this._vdomComponent),
      );
      (this.hasAttribute('hydrate') ? hydrate : render)(this._vdom, this._root);
      adoptStyles(this._root);
    }

    attributeChangedCallback(
      name: string,
      _oldValue: string | null,
      newValueOrNull: string | null,
    ) {
      if (!this._vdom) {
        return;
      }
      // Attributes use `null` as an empty value whereas `undefined` is more
      // common in pure JS components, especially with default parameters.
      // When calling `node.removeAttribute()` we'll receive `null` as the new
      // value. See issue #50.
      const newValue = newValueOrNull === null ? undefined : newValueOrNull;
      const props: Record<string, unknown> = {};
      props[name] = newValue;
      props[toCamelCase(name)] = newValue;
      this._vdom = cloneElement(this._vdom, props);
      render(this._vdom, this._root);
    }

    disconnectedCallback() {
      render((this._vdom = null), this._root);
    }
  }

  return customElements.define(tagName, PreactElement);
}

function ContextProvider<C, P = {}>(
  this: { getChildContext: () => C },
  props: { context: C; children: VNode<P> },
) {
  this.getChildContext = () => props.context;

  const { context, children, ...rest } = props;
  return cloneElement(children, rest);
}

function toCamelCase(str: string) {
  return str.replace(/-(\w)/g, (_, c: string) => (c ? c.toUpperCase() : ''));
}

/**
 * Pass an event listener to each `<slot>` that "forwards" the current
 * context value to the rendered child. The child will trigger a custom
 * event, where will add the context value to. Because events work
 * synchronously, the child can immediately pull of the value right
 * after having fired the event.
 */
function Slot<P = {}>(
  this: { ref: HTMLSlotElement | undefined; _listener: (event: Event) => void },
  props: P,
  context: any,
) {
  const ref: Ref<HTMLSlotElement> = (r) => {
    if (!r) {
      this.ref?.removeEventListener('_preact', this._listener);
    } else {
      this.ref = r;
      if (!this._listener) {
        this._listener = (event: Event) => {
          event.stopPropagation();
          (event as any).detail.context = context;
        };
        r.addEventListener('_preact', this._listener);
      }
    }
  };
  return h<ClassAttributes<HTMLSlotElement> & P, HTMLSlotElement>('slot', { ...props, ref });
}

function toVdom<P>(element: HTMLElement, nodeName: ComponentType<P> | null): ComponentChildren {
  if (element.nodeType === 3) {
    // eslint-disable-next-line
    return (element as any).data;
  }
  if (element.nodeType !== 1) {
    return null;
  }
  const children = [];
  const props: Record<string, unknown> = {};
  const a = element.attributes;
  const cn = element.childNodes as NodeListOf<HTMLElement>;
  let i = 0;
  for (i = a.length; i--; ) {
    if (a[i].name !== 'slot') {
      props[a[i].name] = a[i].value;
      props[toCamelCase(a[i].name)] = a[i].value;
    }
  }

  for (i = cn.length; i--; ) {
    const vnode = toVdom(cn[i], null);
    // Move slots correctly
    const name = cn[i].slot;
    if (name) {
      props[name] = h(Slot, { name }, vnode);
    } else {
      children[i] = vnode;
    }
  }

  // Only wrap the topmost node with a slot
  const wrappedChildren = nodeName ? h(Slot, null, children) : children;
  if (nodeName) {
    return h(nodeName, props as Attributes & P, wrappedChildren);
  } else {
    return h(element.nodeName.toLowerCase(), props, wrappedChildren);
  }
}
