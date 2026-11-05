/** FastAPI error bodies: `HTTPException` gives a string, request validation (422) gives a list. */
export type FastApiValidationIssue = {
  type: string;
  loc: (string | number)[];
  msg: string;
};

export type FastApiErrorBody = {
  detail?: string | FastApiValidationIssue[];
};

export type HealthDto = {
  status: string;
  database?: string;
};
