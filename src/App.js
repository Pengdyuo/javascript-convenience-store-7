// src/App.js
import { MissionUtils } from "@woowacourse/mission-utils";
import fs from "fs";
import path from "path";

class App {
  constructor() {
    this.products = this.loadProducts();
  }

  loadProducts() {
    const products = [];
    // public 디렉토리의 적대 경로를 설정
    const filePath = path.resolve("public/products.md");

    try {
      const data = fs.readFileSync(filePath, "utf-8");
      const lines = data.split(/\r?\n/);

      // 헤더를 제외하고 각 라인을 파싱
      lines.slice(1).forEach((line) => {
        if (line.trim() === "") return; // 빈 줄 무시
        const [name, price, quantity, promotion] = line
          .split(",")
          .map((item) => item.trim());

        products.push({
          name,
          price: parseInt(price, 10),
          stock: parseInt(quantity, 10),
          promotion: promotion === "null" ? null : promotion,
        });
      });

      // 각 상품 이름에 대해 stock ==0인 항목이 없으면 추가
      const productNames = [...new Set(products.map((p) => p.name))];
      productNames.forEach((name) => {
        const hasZeroStock = products.some(
          (p) => p.name === name && p.stock === 0
        );
        if (!hasZeroStock) {
          // 해당 상품의 가격을 가져와서 재고 0인 항목 추가
          const productWithPrice = products.find((p) => p.name === name);
          if (productWithPrice) {
            products.push({
              name,
              price: productWithPrice.price,
              stock: 0,
              promotion: null,
            });
          }
        }
      });
    } catch (error) {
      MissionUtils.Console.print(
        "[ERROR] 상품 목록을 로드하는 중 문제가 발생했습니다."
      );
      process.exit(1);
    }

    return products;
  }

  async run() {
    MissionUtils.Console.print("안녕하세요. W편의점입니다.");
    MissionUtils.Console.print("현재 보유하고 있는 상품입니다.\n");

    // 상품 목록 출력
    this.printProductList();
  }

  printProductList() {
    this.products.forEach((product) => {
      if (product.stock > 0) {
        let line = `- ${product.name} ${this.formatPrice(product.price)}원 ${product.stock}개`;
        if (product.promotion) {
          line += ` ${product.promotion}`;
        }
        MissionUtils.Console.print(line);
      } else {
        MissionUtils.Console.print(
          `- ${product.name} ${this.formatPrice(product.price)}원 재고 없음`
        );
      }
    });
  }

  formatPrice(price) {
    // 가격을 천 단위 구분자로 포맷팅
    return price.toLocaleString("ko-KR");
  }
}

export default App;
