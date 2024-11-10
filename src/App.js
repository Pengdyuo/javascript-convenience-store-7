// src/App.js
import { MissionUtils } from "@woowacourse/mission-utils";
import fs from "fs";
import path from "path";

class App {
  constructor() {
    this.products = this.loadProducts();
    this.total = 0;
  }

  loadProducts() {
    const products = [];
    // public 디렉토리의 절대 경로를 설정
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

    // 구매 입력 처리
    let purchases = [];
    while (true) {
      const input = await MissionUtils.Console.readLineAsync("구매할 상품을 입력해 주세요. (종료하려면 N 입력)");
      if (input.toUpperCase() === "N") break;
      purchases = purchases.concat(input.split(","));
    }

    // 구매 처리
    this.processPurchases(purchases);

    // 총 금액 출력
    const formattedTotal = `내실돈 ${this.total.toLocaleString("ko-KR")}원`;
    MissionUtils.Console.print(formattedTotal);
  }

  processPurchases(purchases) {
    purchases.forEach((purchase) => {
      const match = purchase.match(/\[(.+)-(\d+)\]/);
      if (!match) {
        MissionUtils.Console.print("[ERROR] 잘못된 형식의 입력입니다.");
        return;
      }

      const name = match[1].trim();
      const quantity = parseInt(match[2], 10);

      // 해당 상품 찾기 (재고가 있는 첫 번째 상품)
      const productIndex = this.products.findIndex(
        (p) => p.name === name && p.stock > 0
      );
      if (productIndex === -1) {
        MissionUtils.Console.print(`[ERROR] "${name}" 상품이 존재하지 않거나 재고가 부족합니다.`);
        return;
      }

      const product = this.products[productIndex];

      if (product.stock < quantity) {
        MissionUtils.Console.print("[ERROR] 재고 수량을 초과하여 구매할 수 없습니다. 다시 입력해 주세요.");
        return;
      }

      // 총 금액에 추가
      this.total += product.price * quantity;

      // 재고 업데이트
      this.products[productIndex].stock -= quantity;
    });
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

