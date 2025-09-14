declare module "blessed" {
  export function screen(options?: any): any;
  export function box(options?: any): any;
  export function textbox(options?: any): any;
  export function log(options?: any): any;
}

declare module "blessed-contrib" {
  export function grid(options?: any): any;
  export function map(options?: any): any;
  export function lcd(options?: any): any;
  export function table(options?: any): any;
}
