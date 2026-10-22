export const CITIES = [
  "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta",
  "Gujranwala", "Sialkot", "Hyderabad", "Bahawalpur", "Sargodha", "Sukkur", "Abbottabad", "Mardan",
  "Gujrat", "Sahiwal", "Rahim Yar Khan", "Okara", "Jhelum", "Sheikhupura", "Larkana", "Mirpur (AJK)",
  "Muzaffarabad", "Gilgit", "Dera Ghazi Khan", "Kasur", "Mansehra", "Swat",
].sort();

export function deliveryEstimate(city: string): string {
  return ["Karachi", "Lahore", "Islamabad", "Rawalpindi"].includes(city) ? "2–3 working days" : "3–5 working days";
}

/** Normalises 03xx-xxxxxxx / +92 3xx xxxxxxx to 03xxxxxxxxx, or null if invalid. */
export function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  const m = digits.match(/^(?:\+92|0092|92|0)(3\d{9})$/);
  return m ? `0${m[1]}` : null;
}
