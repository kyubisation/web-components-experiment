export interface WebComponentElement extends HTMLElement {
  connectedCallback?(): void;
  disconnectedCallback?(): void;
  adoptedCallback?(): void;
  attributeChangedCallback?(
    name: string,
    oldValue: string | null,
    newValue: string | null
  ): void;
}

interface WebComponentConstructor {
  new (...params: any[]): WebComponentElement;
}

export interface ComponentDeclaration {
  selector: string;
  styles?: string[];
}

export function Component(declaration: ComponentDeclaration): ClassDecorator {
  let nextId = 0;
  const styles = declaration.styles?.join(" ").trim();
  return (target) => {
    let ctor: WebComponentConstructor = target as any;
    const attributes = componentAttributes.get(target.prototype);
    ctor = class extends ctor {
      constructor(...args: any[]) {
        super(...args);
        if (!this.id) {
          this.id = `${declaration.selector}-${++nextId}`;
        }
        if (!this.shadowRoot) {
          this.attachShadow({ mode: "open" });
        }
        if (styles) {
          const style = document.createElement("style");
          style.textContent = styles;
          this.shadowRoot!.appendChild(style);
        }
      }
    };
    if (attributes) {
      const attributeMap = attributes.reduce(
        (map, attr) => map.set(attr.attribute, attr),
        new Map<string, AttributeInstance>()
      );
      const attributeNames = Object.freeze(Array.from(attributeMap.keys()));
      ctor = class extends ctor {
        static get observedAttributes() {
          return attributeNames;
        }

        constructor(...args: any[]) {
          super(...args);
          for (const attr of attributes!) {
            const value = this.getAttribute(attr.attribute);
            if (value !== null) {
              (this as any)[attr.propertyKey] = value;
            } else {
              syncAttribute(
                this,
                attr.attribute,
                (this as any)[attr.propertyKey]
              );
            }
          }
        }

        attributeChangedCallback(
          name: string,
          oldValue: string | null,
          newValue: string | null
        ) {
          const attr = attributeMap.get(name);
          if (
            attr &&
            oldValue !== newValue &&
            (this as any)[attr.propertyKey] !== newValue
          ) {
            console.log(`Changing ${name}: ${oldValue} => ${newValue}`);
            (this as any)[attr.propertyKey] = newValue;
          }

          super.attributeChangedCallback?.(name, oldValue, newValue);
        }
      };
    }
    customElements.define(declaration.selector, ctor);
    return ctor as any;
  };
}

export interface AttributeDeclaration {}

interface AttributeInstance {
  propertyKey: string | symbol;
  attribute: string;
  declaration: AttributeDeclaration;
}

const componentAttributes = new WeakMap<Object, AttributeInstance[]>();
const kebabize = (str: string) =>
  str
    .split("")
    .map((letter, idx) =>
      letter.toUpperCase() === letter
        ? `${idx !== 0 ? "-" : ""}${letter.toLowerCase()}`
        : letter
    )
    .join("");

export function Attribute(
  declaration: AttributeDeclaration = {}
): PropertyDecorator {
  return (
    target,
    propertyKey,
    descriptor?: TypedPropertyDescriptor<unknown>
  ) => {
    let attributes = componentAttributes.get(target);
    if (!attributes) {
      attributes = [];
      componentAttributes.set(target, attributes);
    }

    const propertyKeyString =
      typeof propertyKey === "string" ? propertyKey : propertyKey.description!;
    const attribute = kebabize(propertyKeyString);
    attributes.push({ propertyKey, attribute, declaration });
    if (descriptor) {
      const setter = descriptor.set;
      descriptor.set = function (value) {
        setter?.call(this, value);
        syncAttribute(this as HTMLElement, attribute, value);
      };
    } else {
      const propertySymbol = Symbol(propertyKey.toString());
      Object.defineProperty(target, propertyKey, {
        configurable: true,
        enumerable: false,
        get: function () {
          return this[propertySymbol];
        },
        set: function (value) {
          this[propertySymbol] = value;
          syncAttribute(this as HTMLElement, attribute, value);
        },
      });
    }
  };
}

function syncAttribute(
  thisArg: HTMLElement,
  attribute: string,
  value: unknown
) {
  if (value == null) {
    thisArg.removeAttribute(attribute);
    return;
  }

  const stringValue = `${value}`;
  if (thisArg.getAttribute(attribute) !== stringValue) {
    thisArg.setAttribute(attribute, stringValue);
  }
}
