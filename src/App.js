// src/App.js
import { MissionUtils } from "@woowacourse/mission-utils";
import fs from "fs";
import path from "path";

class App {
  constructor() {
    this.products = this.loadProducts();
    this.total = 0;
    this.purchaseHistory = [];
    this.currentDate = new Date(MissionUtils.DateTimes.now());
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
    while (true) {
      this.purchaseHistory = [];
      this.total = 0;

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

      // 멤버십 할인 처리
      let membershipDiscount = 0;
      let applyMembership = false;

      if (this.purchaseHistory.length > 0) {
        MissionUtils.Console.print("");
        const membershipInput = await MissionUtils.Console.readLineAsync(
          "멤버십 할인을 받으시겠습니까? (Y/N)"
        );
        if (membershipInput.toUpperCase() === "Y") {
          applyMembership = true;
          membershipDiscount = Math.round(this.total * 0.2); // Assuming 20% membership discount
          this.total -= membershipDiscount;
        }
      }

      // 총 금액 출력 (천 단위 구분자 포함)
      const formattedTotal = `내실돈 ${this.total.toLocaleString("ko-KR")}원`;
      MissionUtils.Console.print("");

      // 상세 내역 출력
      MissionUtils.Console.print("=============W 편의점================");
      MissionUtils.Console.print("상품명\t\t수량\t금액");
      this.purchaseHistory.forEach((item) => {
        MissionUtils.Console.print(
          `${item.name}\t\t${item.quantity}\t${item.cost.toLocaleString(
            "ko-KR"
          )}원`
        );
      });
      MissionUtils.Console.print("============증\t정===============");
      this.purchaseHistory.forEach((item) => {
        if (item.freeItems > 0) {
          MissionUtils.Console.print(`${item.name}\t\t${item.freeItems}`);
        }
      });
      MissionUtils.Console.print("====================================");
      MissionUtils.Console.print(
        `총구매액\t\t${this.purchaseHistory.reduce(
          (acc, item) => acc + item.cost + item.discount,
          0
        ).toLocaleString("ko-KR")}원`
      );
      MissionUtils.Console.print(
        `행사할인\t\t-${this.purchaseHistory.reduce(
          (acc, item) => acc + item.discount,
          0
        ).toLocaleString("ko-KR")}원`
      );
      MissionUtils.Console.print(
        `멤버십할인\t\t-${membershipDiscount.toLocaleString("ko-KR")}원`
      );
      MissionUtils.Console.print(`내실돈\t\t ${this.total.toLocaleString("ko-KR")}원`);
      MissionUtils.Console.print("");
      MissionUtils.Console.print(
        "감사합니다. 구매하고 싶은 다른 상품이 있나요? (Y/N)"
      );

      const input = await MissionUtils.Console.readLineAsync("");
      if (input.toUpperCase() === "N") {
        MissionUtils.Console.print("감사합니다. 이용해 주셔서 감사합니다.");
        break;
      }
    }
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
      const cost = product.price * quantity;
      this.total += cost;

      // 재고 업데이트
      this.products[productIndex].stock -= quantity;

      // 기록에 추가
      this.purchaseHistory.push({
        name: product.name,
        quantity,
        cost,
        discount: 0,
        freeItems: 0,
      });
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
