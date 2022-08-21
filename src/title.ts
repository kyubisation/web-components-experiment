import { Component, Attribute, WebComponentElement } from "./component";
import styles from "./title.scss";

type HeadingLevels = "1" | "2" | "3" | "4" | "5" | "6";
const validHeadingLevels = ["1", "2", "3", "4", "5", "6"];

@Component({
  selector: "wce-title",
  styles: [styles],
})
export class WceTitle extends HTMLElement implements WebComponentElement {
  @Attribute()
  public get level(): HeadingLevels {
    return this._level;
  }
  public set level(value: HeadingLevels) {
    if (!value) {
      value = "1";
    } else if (!validHeadingLevels.includes(value)) {
      return;
    }
    const hasChanged = this._level !== value;
    this._level = value;
    if (hasChanged) {
      this._render();
    }
  }
  private _level: HeadingLevels = "1";

  private _heading?: HTMLElement;

  connectedCallback() {
    this._render();
  }

  private _render() {
    if (!this._heading) {
      this._heading = this.shadowRoot!.appendChild(
        document.createElement(`h${this.level}`)
      );
      this._heading.appendChild(document.createElement("slot"));
    } else if (this._heading.tagName !== `H${this.level}`) {
      const heading = document.createElement(`h${this.level}`);
      for (const element of this._heading.children) {
        heading.appendChild(element);
      }
      this._heading.replaceWith(heading);
      this._heading = heading;
    }
  }
}
