import { Product } from './types';

interface ProductFormProps {
  product: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}

declare const ProductForm: React.FC<ProductFormProps>;
export default ProductForm; 