// Include an unused reference to ComponentProps to ensure we don't import it twice.
import { ComponentProps } from "react";
type Props = JSX.LibraryManagedAttributes<T, ComponentProps<T>>;
