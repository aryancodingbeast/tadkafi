import { useState } from 'react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Input } from './ui/input';
import { Minus, Plus } from 'lucide-react';

interface QuantityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
  maxQuantity: number;
  productName: string;
}

export function QuantityDialog({
  isOpen,
  onClose,
  onConfirm,
  maxQuantity,
  productName,
}: QuantityDialogProps) {
  const [quantity, setQuantity] = useState(1);

  const handleQuantityChange = (value: string) => {
    const newQuantity = parseInt(value);
    if (!isNaN(newQuantity) && newQuantity >= 1 && newQuantity <= maxQuantity) {
      setQuantity(newQuantity);
    }
  };

  const handleIncrement = () => {
    if (quantity < maxQuantity) {
      setQuantity(quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleConfirm = () => {
    onConfirm(quantity);
    setQuantity(1);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Select Quantity</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-600 mb-4">
            {productName}
            <br />
            Maximum available: {maxQuantity}
          </p>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={handleDecrement}
              disabled={quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              min={1}
              max={maxQuantity}
              className="w-20 text-center"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleIncrement}
              disabled={quantity >= maxQuantity}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Add to Cart</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
