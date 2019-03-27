import { $Call } from "utility-types";
type ExtractReturnType = <R>(arg0: () => R) => R;
type Fn = () => number;
type ReturnType = $Call<ExtractReturnType, Fn>;