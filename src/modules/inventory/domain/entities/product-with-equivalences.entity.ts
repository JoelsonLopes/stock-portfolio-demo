import type { Equivalence } from "./equivalence.entity";
import type { Product } from "./product.entity";

export interface ProductWithEquivalences extends Product {
  equivalences: Equivalence[];
  allRelatedCodes: string[];
}
