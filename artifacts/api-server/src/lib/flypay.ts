import crypto from "crypto";

function flypaySign(data: Record<string, string>, secret: string): string {
  const sorted = Object.keys(data)
    .filter((k) => k !== "sn" && k !== "notifyUrl")
    .sort();

  const parts = sorted.map((k) => `${k}=${encodeURIComponent(data[k])}`);
  parts.push(`secret=${secret}`);

  const str = parts.join("").replace(/%20/g, "+");
  return crypto.createHash("md5").update(str).digest("hex");
}

export interface DepositResult {
  qrCode: string;
  ref: string;
  raw: Record<string, unknown>;
}

export async function createDeposit(
  ref: string,
  amount: number,
  customerId: string,
  callbackUrl: string,
  appId: string,
  secret: string
): Promise<DepositResult> {
  const url = "https://api.idmapi66.com/app/pay/pay.php";

  const payload: Record<string, string> = {
    appid: appId,
    order: ref,
    payType: "QRIS",
    price: String(amount),
    uid: customerId || "user",
    notifyUrl: callbackUrl,
  };
  payload["sn"] = flypaySign(payload, secret);

  const formBody = new URLSearchParams(payload).toString();

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody,
  });

  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Flypay parse error: ${text}`);
  }

  if (data["e"] !== undefined && data["e"] !== 0) {
    throw new Error(`Flypay Error: ${(data["m"] as string) ?? text}`);
  }

  const d = (data["d"] as Record<string, string>) ?? {};
  const dataObj = (data["data"] as Record<string, string>) ?? {};

  const qrCode = d["gr"] ?? d["h5"] ?? dataObj["qr"] ?? "";

  return { qrCode, ref, raw: data };
}

export async function checkDepositStatus(
  ref: string,
  appId: string,
  secret: string
): Promise<string> {
  const url = "https://api.idmapi66.com/app/pay/search.php";
  const payload: Record<string, string> = { appid: appId, order: ref };
  payload["sn"] = flypaySign(payload, secret);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(payload).toString(),
  });

  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    return "MENUNGGU";
  }

  const d = data["d"] as Record<string, number> | undefined;
  if (d && d["status"] !== undefined) {
    const st = d["status"];
    if (st === 3 || st === 5) return "SUKSES";
    if (st === 0 || st === 6) return "GAGAL";
  }
  return "MENUNGGU";
}

export function parseCallback(params: Record<string, string>): {
  ref: string;
  status: string;
} {
  const ref = params["order"] ?? params["orderId"] ?? "";
  let status = "MENUNGGU";

  if (params["status"] !== undefined) {
    const s = params["status"];
    if (s === "3" || s === "4" || s === "5" || s.toLowerCase() === "success") {
      status = "SUKSES";
    } else if (s === "0" || s === "6") {
      status = "GAGAL";
    }
  } else if (params["transaction_id"]) {
    status = "SUKSES";
  } else {
    status = "SUKSES";
  }

  return { ref, status };
}
