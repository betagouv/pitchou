declare module "simple-svelte-autocomplete";
declare module "@odfjs/odfjs" {
  type SheetName = string;
  type SheetCellRawContent = {
    value: string | number | null | undefined;
    type:
      | "float"
      | "percentage"
      | "currency"
      | "date"
      | "time"
      | "boolean"
      | "string"
      | "b"
      | "d"
      | "e"
      | "inlineStr"
      | "n"
      | "s"
      | "str";
  };
  type SheetRowRawContent = SheetCellRawContent[];
  type SheetRawContent = SheetRowRawContent[];

  export function getODSTableRawContent(
    arrayBuffer: ArrayBuffer | Uint8Array,
  ): Promise<Map<SheetName, SheetRawContent>>;

  export function createOdsFile(sheetsData: Map<SheetName, SheetRawContent>): Promise<ArrayBuffer>;

  export function sheetRawContentToObjects<T = any>(rawContent: SheetRawContent): T[];

  export function tableRawContentToObjects<T = any>(
    rawContentSheets: Map<SheetName, SheetRawContent>,
  ): Map<SheetName, T[]>;

  export function tableWithoutEmptyRows(
    rawContentTable: Map<SheetName, SheetRawContent>,
  ): Map<SheetName, SheetRawContent>;

  export function isRowNotEmpty(row: SheetRowRawContent): boolean;

  export function fillOdtTemplate(
    template: ArrayBuffer,
    data: Record<string, unknown>,
  ): Promise<ArrayBuffer>;

  export function getOdtTextContent(odt: ArrayBuffer): Promise<string>;
}
declare module "minimist";
declare module "lunr-languages/lunr.stemmer.support";
declare module "lunr-languages/lunr.fr";
