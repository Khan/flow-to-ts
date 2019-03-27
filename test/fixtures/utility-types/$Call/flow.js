type ExtractReturnType = <R>(() => R) => R;
type Fn = () => number;
type ReturnType = $Call<ExtractReturnType, Fn>;