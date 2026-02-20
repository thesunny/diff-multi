export type InsertChange = {
  op: "insert";
  text: string;
  id: string;
};

export type DeleteChange = {
  op: "delete";
  text: string;
  id: string;
};

export type EqualChange = {
  op: "equal";
  text: string;
};

/**
 * This is a localized version of the Change type from jsdiff (package `diff`).
 * We are using this to define the `Change` type for semantic diff to retain
 * backwards compatibility with the `diff` package.
 */
export type Change = InsertChange | DeleteChange | EqualChange;
