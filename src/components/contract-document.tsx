import { COMPANY } from "@/lib/company";
import type { ContractContext } from "@/lib/contract";
import { formatThaiDate } from "@/lib/thai";
import { cn } from "cn";

function Fill({
  value,
  fallback = "................................",
  className,
}: {
  value?: string | number;
  fallback?: string;
  className?: string;
}) {
  const text = value === undefined || value === null ? "" : String(value).trim();
  if (text) {
    return <span className={cn("font-semibold", className)}>{text}</span>;
  }
  return (
    <span
      className={cn(
        "inline-block min-w-[7rem] border-b border-dotted border-neutral-400 text-transparent",
        className
      )}
    >
      {fallback}
    </span>
  );
}

function SignLine({
  role,
  name,
  sub,
}: {
  role: string;
  name?: string;
  sub?: string;
}) {
  return (
    <div className="flex min-w-[220px] flex-1 flex-col items-center text-center">
      <p className="w-full">
        ลงชื่อ
        <span className="mx-1 inline-block min-w-[11rem] border-b border-neutral-800">
          &nbsp;
        </span>
        {role}
      </p>
      <p className="mt-1">
        ({" "}
        {name?.trim() ? (
          <span className="font-semibold">{name}</span>
        ) : (
          <span className="inline-block min-w-[10rem]">
            .............................................
          </span>
        )}{" "}
        )
      </p>
      {sub ? <p className="mt-0.5">{sub}</p> : null}
    </div>
  );
}

function SignatureBlock({ ctx }: { ctx: ContractContext }) {
  return (
    <div className="mt-8 space-y-8">
      <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
        <SignLine
          role="ผู้ว่าจ้าง"
          name={ctx.client_authorized}
          sub={ctx.client_position}
        />
        <SignLine
          role="ผู้รับจ้าง"
          name={ctx.contractor_authorized}
          sub={COMPANY.name}
        />
      </div>
      <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
        <SignLine role="พยาน" name={ctx.witness_client} />
        <SignLine role="พยาน" name={ctx.witness_contractor} />
      </div>
    </div>
  );
}

export function ContractDocument({ ctx }: { ctx: ContractContext }) {
  const contractDate = formatThaiDate(ctx.contract_date);
  const startDate = formatThaiDate(ctx.start_date);
  const endDate = formatThaiDate(ctx.end_date);
  const monthsLabel = ctx.contract_months ? String(ctx.contract_months) : "";

  return (
    <div id="contract-print" className="contract-print-root">
      <article className="contract-page">
        <header className="border-b-2 border-teal-800 pb-3 text-center">
          <p className="text-[11px] tracking-wide text-teal-800">
            {COMPANY.name}
          </p>
          <h1 className="mt-1 text-[22px] font-bold leading-tight tracking-wide">
            สัญญาบริการทำความสะอาด
          </h1>
        </header>

        <div className="mt-4 flex flex-col gap-1 text-[13.5px] sm:flex-row sm:items-start sm:justify-between">
          <p>
            ทำที่: {COMPANY.madeAt}
            <br />
            <span className="text-[12.5px]">{COMPANY.address}</span>
          </p>
          <p className="sm:text-right">
            สัญญาเลขที่ <Fill value={ctx.contract_no} />
            <br />
            วันที่ <Fill value={contractDate} />
          </p>
        </div>

        <p className="contract-indent mt-4">
          สัญญาฉบับนี้ทำขึ้นระหว่าง
        </p>
        <p className="contract-indent">
          <Fill value={ctx.client_name} /> ตั้งอยู่ที่{" "}
          <Fill value={ctx.client_address} /> โดย{" "}
          <Fill value={ctx.client_authorized} />{" "}
          <Fill value={ctx.client_position} fallback="................" />{" "}
          ผู้มีอำนาจกระทำแทน ซึ่งต่อไปในสัญญานี้เรียกว่า “ผู้ว่าจ้าง” ฝ่ายหนึ่ง
          กับ
        </p>
        <p className="contract-indent">
          {COMPANY.name} (เลขทะเบียนนิติบุคคล : {COMPANY.registrationNo})
          สำนักงานตั้งอยู่ {COMPANY.address} ซึ่งต่อไปในสัญญานี้จะเรียกว่า
          “ผู้รับจ้าง” อีกฝ่ายหนึ่ง
        </p>

        <p className="contract-indent mt-3">
          โดยที่ผู้ว่าจ้างมีความประสงค์จะว่าจ้างให้ผู้รับจ้างดูแลทำความสะอาด{" "}
          <Fill value={ctx.client_name} /> ซึ่งต่อไปในสัญญานี้จะเรียกว่า
          “พื้นที่” และผู้รับจ้างตกลงรับจ้างเหมาทำความสะอาดตามความประสงค์ของ
          ผู้ว่าจ้าง
        </p>
        <p className="contract-indent">
          คู่สัญญาทั้งสองฝ่ายจึงร่วมกันตกลงดังมีข้อความต่อไปนี้คือ
        </p>

        <ol className="contract-clauses">
          <li>
            คู่สัญญาทั้งสองฝ่ายตกลงกำหนดขอบเขตของ “พื้นที่”
            และรายละเอียดของงาน, ขั้นตอน, วิธีการทำความสะอาด
            ปรากฏตามเอกสารแนบท้ายสัญญา
          </li>
          <li>
            คู่สัญญาทั้งสองฝ่ายตกลงให้สัญญาฉบับนี้มีผลใช้บังคับ นับตั้งแต่วันที่{" "}
            <Fill value={startDate} /> ถึงวันที่ <Fill value={endDate} />{" "}
            (ระยะเวลา <Fill value={monthsLabel} fallback="......" /> เดือน)
            ทั้งนี้หากคู่สัญญาฝ่ายหนึ่งฝ่ายใดประสงค์จะบอกเลิกสัญญาให้แจ้งเป็นลายลักษณ์อักษรให้กับคู่สัญญาอีกฝ่ายทราบล่วงหน้าไม่น้อยกว่า
            30 (สามสิบ) วัน ก่อนที่จะเลิกสัญญานี้ได้
            โดยไม่จำเป็นต้องแจ้งเหตุผลของการเลิกสัญญา
            และไม่ถือว่าคู่สัญญาฝ่ายนั้นผิดสัญญาแต่ประการใด
          </li>
          <li>
            ผู้รับจ้างจะจัดหาพนักงานรักษาความสะอาด เข้าปฏิบัติหน้าที่ตามสัญญา
            รายละเอียดตามเอกสารแนบท้ายสัญญา
          </li>
          <li>
            ผู้รับจ้างจะต้องจัดหาพนักงานรักษาความสะอาดเสริมหรือทดแทนกรณีที่พนักงานรักษาความสะอาดประจำมาปฏิบัติหน้าที่ไม่ได้
            โดยผู้รับจ้างจะเป็นผู้กำหนดวันหยุดของพนักงานรักษาความสะอาดของผู้รับจ้างเอง
            โดยไม่กระทบกับการทำงานตามสัญญา
            <span className="mt-1 block">
              ในกรณีที่ผู้รับจ้างไม่สามารถจัดหาพนักงานทดแทนได้
              ผู้ว่าจ้างจะจ่ายค่าจ้างตามส่วนของวันเวลาที่ได้ปฏิบัติงานจริงในแต่ละเดือน
              โดยผู้รับจ้างยินยอมให้ผู้ว่าจ้างหักเงินค่าจ้างรายเดือนได้ตามจำนวนวันหรือเวลา
              (แล้วแต่กรณี)
              ที่พนักงานทำความสะอาดของผู้รับจ้างไม่ได้ทำงานนั้น
            </span>
          </li>
          <li>
            ผู้ว่าจ้างยินดีจ่ายค่าจ้างให้กับผู้รับจ้างสำหรับพนักงานรักษาความสะอาดประจำ
            รายละเอียดตามเอกสารแนบท้ายสัญญา 1 (ซึ่งยังไม่รวมภาษีมูลค่าเพิ่ม)
            ภายในวันที่ 30 ของทุก ๆ เดือน โดยเงื่อนไขการวางบิล/โอนชำระเงิน
            ให้เป็นไปตามที่ผู้ว่าจ้างกำหนด
          </li>
          <li>
            {ctx.equipment_clause}
            {ctx.consumable_lines.length > 0 ? (
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {ctx.consumable_lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </li>
          <li>
            หากมีการกำหนดค่าแรงขั้นต่ำใหม่โดยผลของกฎหมายแรงงาน
            ผู้ว่าจ้างตกลงยินยอมปรับค่าบริการให้กับผู้รับจ้างตามที่มีการตกลงกันในภายหลัง
          </li>
          <li>
            พนักงานรักษาความสะอาดที่ผู้รับจ้างส่งมาปฏิบัติงานตามสัญญานี้
            ให้ถือว่าเป็นลูกจ้างของผู้รับจ้าง
            ซึ่งผู้รับจ้างเป็นผู้รับผิดชอบต่อลูกจ้างของตนตามที่กฎหมายบังคับ
          </li>
          <li>
            ผู้ว่าจ้างจะอำนวยความสะดวกโดยจัดหากระแสไฟฟ้าและน้ำประปาที่จำเป็นเพื่อใช้ในการให้บริการทำความสะอาดตามสัญญานี้ให้เพียงพอ
            รวมทั้งจัดหาสถานที่สำหรับเก็บเครื่องมือเครื่องใช้
            และอุปกรณ์ที่จำเป็นต้องใช้ในการทำความสะอาดประจำวัน
          </li>
          <li>
            การเพิ่มหรือลดจำนวนพนักงานปฏิบัติหน้าที่ หรือข้อตกลงใดๆ
            อันเกิดขึ้นภายหลังจะดำเนินการและใช้บังคับได้ต่อเมื่อได้รับความยินยอมเห็นชอบร่วมกัน
            โดยกำหนดให้ทำข้อตกลงเป็นบันทึกต่อท้ายสัญญาในแต่ละครั้งไป
          </li>
          <li>
            ผู้รับจ้างตกลงจัดอุปกรณ์ให้พนักงานรักษาความสะอาดใช้ในการปฏิบัติหน้าที่ให้มีประสิทธิภาพ
            โดยมีรายละเอียดตามเอกสารแนบท้ายสัญญา
          </li>
          <li>
            เมื่อผู้ว่าจ้างเห็นว่าพนักงานรักษาความสะอาดผู้ใดไม่เหมาะสมที่จะปฏิบัติหน้าที่
            และได้แจ้งให้ผู้รับจ้างรับทราบแล้ว
            ผู้รับจ้างจะต้องดำเนินการแก้ไขหรือเปลี่ยนตัวพนักงานรักษาความสะอาดใหม่ที่เหมาะสมให้แก่ผู้ว่าจ้างทันที
          </li>
          <li>
            ภายในเวลา 3 เดือนนับแต่สัญญานี้สิ้นสุด
            ผู้ว่าจ้างหรือบุคคลที่ผู้ว่าจ้างมีส่วนได้เสียจะต้องไม่รับพนักงานทำความสะอาดของผู้รับจ้างเป็นลูกจ้างของผู้ว่าจ้างหรือของบุคคลที่ผู้ว่าจ้างมีส่วนได้เสีย
            เว้นแต่จะได้รับความยินยอมจากผู้รับจ้าง
          </li>
          <li>
            ผู้รับจ้างจะต้องรับผิดชอบต่อผู้ว่าจ้างดังนี้
            <span className="clause-sub">
              14.1 ผู้รับจ้างยินดีจะดูแลรักษาสถานที่หรือบริเวณทำความสะอาดของผู้ว่าจ้างให้สะอาดอยู่เสมอ
            </span>
            <span className="clause-sub">
              14.2 ผู้รับจ้างได้จัดให้มีแบบฟอร์มพนักงาน มีตราสัญลักษณ์ของผู้รับจ้าง
              และบัตรประจำตัวพนักงาน
            </span>
            <span className="clause-sub">
              14.3 พนักงานของผู้รับจ้างจะต้องปฏิบัติตามระเบียบข้อบังคับที่ผู้ว่าจ้างกำหนด
            </span>
            <span className="clause-sub">
              14.4 จัดหาและส่งพนักงานทำความสะอาดที่ดี ซื่อสัตย์
              มีความระมัดระวังรอบคอบมาทำงาน
            </span>
            <span className="clause-sub">
              14.5 ผู้รับจ้างจะต้องรับผิดชอบต่อความเสียหายแก่ทรัพย์สินของผู้ว่าจ้างอันเกิดจากการกระทำของพนักงานของผู้รับจ้างโดยผ่านการสอบสวนร่วมกันเป็นที่แน่ชัดแล้ว
              โดยผู้รับจ้างยอมชดใช้ในวงเงินครั้งละไม่เกิน 10,000 บาท ภายใน 15
              วัน หลังจากการสอบสวนเป็นที่ยุติ
            </span>
          </li>
          <li>
            พนักงานของผู้รับจ้างจะต้องลงบันทึกเวลาเริ่มทำงานและเวลาเลิกงานทุกครั้งไว้เป็นหลักฐาน
          </li>
          <li>
            ผู้ว่าจ้างหรือผู้รับจ้าง มีสิทธิบอกเลิกสัญญาฉบับนี้ได้ทันที
            หากปรากฏว่าฝ่ายใดฝ่ายหนึ่งได้ทำผิดสัญญา
            โดยจะต้องแจ้งให้อีกฝ่ายหนึ่งทราบเป็นลายลักษณ์อักษรล่วงหน้าอย่างน้อย
            30 วัน
          </li>
          <li>
            การบอกกล่าวใดๆ ตามสัญญานี้ต้องทำเป็นหนังสือและแจ้งไปยังคู่สัญญาอีกฝ่ายหนึ่งตามที่อยู่ข้างต้น
          </li>
        </ol>

        <p className="contract-indent mt-3">
          สัญญานี้ทำขึ้นเป็นสองฉบับมีข้อความถูกต้องตรงกัน
          คู่สัญญาทั้งสองฝ่ายได้อ่านและเข้าใจข้อความทั้งหมดโดยตลอดแล้วเห็นว่าถูกต้องตรงตามเจตนาของตน
          จึงได้ลงลายมือชื่อพร้อมประทับตราไว้เป็นสำคัญต่อหน้าพยาน
        </p>

        <SignatureBlock ctx={ctx} />
      </article>

      <article className="contract-page">
        <header className="border-b-2 border-teal-800 pb-3 text-center">
          <p className="text-[11px] tracking-wide text-teal-800">
            {COMPANY.name}
          </p>
          <h1 className="mt-1 text-[20px] font-bold leading-tight">
            เอกสารแนบท้ายสัญญา 1
          </h1>
        </header>

        <p className="mt-4">
          หน่วยงาน: <Fill value={ctx.client_name} />
        </p>
        <p>
          พื้นที่ให้บริการ: <Fill value={ctx.client_address} />
        </p>

        <p className="mt-3 font-semibold">
          จำนวนพนักงาน, วันเวลาปฏิบัติหน้าที่ และอัตราค่าบริการ
        </p>

        <div className="mt-2 overflow-x-auto">
          <table className="contract-table">
            <thead>
              <tr>
                <th>ตำแหน่งงาน</th>
                <th>วันปฏิบัติงาน</th>
                <th>เวลาปฏิบัติงาน</th>
                <th>จำนวน</th>
                <th>ค่าจ้าง/คน (บาท/เดือน)</th>
                <th>รวมค่าจ้าง (บาท/เดือน)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>พนักงานรักษาความสะอาด</td>
                <td>
                  <Fill value={ctx.work_days} fallback="........" />
                </td>
                <td>
                  <Fill value={ctx.work_hours} fallback="........" />
                </td>
                <td>
                  {ctx.staff_count ? `${ctx.staff_count} คน` : "...... คน"}
                </td>
                <td className="text-right">
                  {ctx.price_per_head === "0.00" ? "........" : ctx.price_per_head}{" "}
                  บาท
                </td>
                <td className="text-right">
                  {ctx.monthly_total === "0.00" ? "........" : ctx.monthly_total}{" "}
                  บาท
                </td>
              </tr>
              <tr className="font-semibold">
                <td>รวม</td>
                <td />
                <td />
                <td>
                  {ctx.staff_count ? `${ctx.staff_count} คน` : "...... คน"}
                </td>
                <td />
                <td className="text-right">
                  {ctx.monthly_total === "0.00" ? "........" : ctx.monthly_total}{" "}
                  บาท
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-3">
          ปฏิบัติงาน: <Fill value={ctx.work_days} />{" "}
          (หยุดนักขัตฤกษ์ยึดตามผู้ว่าจ้าง)
        </p>
        <p>
          ระยะเวลาสัญญา: วันที่ <Fill value={startDate} /> ถึงวันที่{" "}
          <Fill value={endDate} />
        </p>
        <p>
          อัตราค่าบริการตลอดสัญญา ({monthsLabel || "......"} เดือน):{" "}
          <Fill
            value={
              ctx.total_contract_price_raw > 0
                ? `${ctx.total_contract_price} บาท`
                : ""
            }
          />{" "}
          (
          <Fill
            value={
              ctx.total_contract_price_raw > 0 ? ctx.total_price_text : ""
            }
          />
          )
        </p>

        <p className="mt-3 font-semibold">หมายเหตุ :</p>
        <ol className="mt-1 list-decimal space-y-1 pl-6">
          <li>ราคาดังกล่าวยังไม่รวมภาษีมูลค่าเพิ่ม</li>
          <li>
            {ctx.equipment_clause}
            {ctx.consumable_lines.length > 0 ? (
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {ctx.consumable_lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </li>
          <li>
            กรณีพนักงานทำงานล่วงเวลาในวันทำงาน อัตราค่าบริการชั่วโมงละ{" "}
            <Fill value={ctx.ot_rate} fallback="......" /> บาท
            ทั้งนี้ไม่รวมวันนักขัตฤกษ์
          </li>
          <li>
            ในกรณีที่พนักงานทำความสะอาด ลาป่วย ลากิจล่วงหน้า
            ผู้รับจ้างต้องจัดส่งพนักงานเข้าทดแทนภายใน 2 ชั่วโมงจากเวลาปกติ
            หากไม่สามารถจัดส่งตามกำหนด
            ผู้รับจ้างยอมเสียค่าปรับตามที่ตกลงในสัญญา
          </li>
        </ol>

        <SignatureBlock ctx={ctx} />
      </article>
    </div>
  );
}
