import "@tanstack/react-query";

declare module "@tanstack/react-query" {
  interface Register {
    defaultError: any;
    defaultQueryFnData: any;
    defaultQueryData: any;
    defaultInfiniteQueryData: any;
  }
}
