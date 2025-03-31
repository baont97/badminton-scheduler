import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

const SalesBanner = () => {
  return (
    <div className="bg-gradient-to-r from-badminton to-badminton/80 text-white">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-xs">
              Mới
            </Badge>
            <span className="text-xs font-medium">Áo đẹp vãi cả chưởng</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="bg-white text-badminton hover:bg-white/90 h-7 px-3"
            onClick={() =>
              window.open(
                "https://shopee.vn/sayboutique2?entryPoint=ShopBySearch&searchKeyword=say%20boutique%202",
                "_blank"
              )
            }
          >
            Mua ngay
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SalesBanner;
