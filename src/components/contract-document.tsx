import { BrandMark } from "@/components/brand-mark";
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
  company,
  position,
}: {
  role: string;
  name?: string;
  company?: string;
  position?: string;
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
      {company ? (
        <p className="mt-0.5 text-[12.5px] font-medium">{company}</p>
      ) : null}
      <p className="mt-0.5 text-[12.5px]">
        ตำแหน่ง{" "}
        {position?.trim() ? (
          <span className="font-semibold">{position}</span>
        ) : (
          <span className="inline-block min-w-[8rem] border-b border-dotted border-neutral-400">
            &nbsp;
          </span>
        )}
      </p>
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
          position={ctx.client_position}
        />
        <SignLine
          role="ผู้รับจ้าง"
          name={ctx.contractor_authorized}
          company={COMPANY.name}
          position={ctx.contractor_position || "ผู้มีอำนาจลงนาม"}
        />
      </div>
      <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
        <SignLine
          role="พยานฝ่ายผู้ว่าจ้าง"
          name={ctx.witness_client}
        />
        <SignLine
          role="พยานฝ่ายผู้รับจ้าง"
          name={ctx.witness_contractor}
        />
      </div>
    </div>
  );
}

function ContractHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="border-b-2 border-teal-800 pb-3">
      <div className="flex items-start gap-3">
        <BrandMark variant="contract" className="mt-0.5" />
        <div className="min-w-0 flex-1 text-center">
          <p className="text-[11px] tracking-wide text-teal-800">
            {COMPANY.name}
          </p>
          <h1 className="mt-1 text-[20px] font-bold leading-tight tracking-wide sm:text-[22px]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-[13px] text-neutral-700">{subtitle}</p>
          ) : null}
        </div>
        {/* spacer so title stays centered opposite the logo */}
        <div
          aria-hidden
          className="invisible hidden h-10 w-[11.5rem] shrink-0 sm:block sm:h-11 sm:w-[13rem] print:block print:h-9 print:w-[11rem]"
        />
      </div>
    </header>
  );
}

function MultilineFill({
  value,
  fallback,
}: {
  value: string;
  fallback: string;
}) {
  if (value.trim()) {
    return (
      <p className="whitespace-pre-wrap leading-6">
        <span className="font-semibold">{value}</span>
      </p>
    );
  }
  return <p className="leading-6 text-neutral-500">{fallback}</p>;
}

export function ContractDocument({ ctx }: { ctx: ContractContext }) {
  const contractDate = formatThaiDate(ctx.contract_date);
  const startDate = formatThaiDate(ctx.start_date);
  const endDate = formatThaiDate(ctx.end_date);
  const monthsLabel = ctx.contract_months ? String(ctx.contract_months) : "";
  const roles =
    ctx.staff_roles.length > 0
      ? ctx.staff_roles
      : [
          {
            id: "fallback",
            title: "พนักงานรักษาความสะอาด",
            count: 0,
            price_per_head: 0,
            price_per_head_text: "0.00",
            monthly: 0,
            monthly_text: "0.00",
          },
        ];

  return (
    <div id="contract-print" className="contract-print-root">
      <article className="contract-page">
        <ContractHeader title="สัญญาบริการทำความสะอาด" />

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

        <p className="contract-indent mt-4">สัญญาฉบับนี้ทำขึ้นระหว่าง</p>
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
          สำนักงานตั้งอยู่ {COMPANY.address} โดย{" "}
          <Fill
            value={ctx.contractor_authorized}
            fallback="................................"
          />{" "}
          <Fill
            value={ctx.contractor_position}
            fallback="ผู้มีอำนาจลงนาม"
          />{" "}
          ผู้มีอำนาจกระทำแทน ซึ่งต่อไปในสัญญานี้จะเรียกว่า “ผู้รับจ้าง”
          อีกฝ่ายหนึ่ง
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
            และรายละเอียดของงาน ขั้นตอน วิธีการทำความสะอาด
            รวมถึงรายการอุปกรณ์และน้ำยาทำความสะอาด
            ปรากฏตามเอกสารแนบท้ายสัญญา 2
          </li>
          <li>
            คู่สัญญาทั้งสองฝ่ายตกลงให้สัญญาฉบับนี้มีผลใช้บังคับ นับตั้งแต่วันที่{" "}
            <Fill value={startDate} /> ถึงวันที่ <Fill value={endDate} />{" "}
            (ระยะเวลา <Fill value={monthsLabel} fallback="......" /> เดือน)
            ทั้งนี้หากคู่สัญญาฝ่ายหนึ่งฝ่ายใดประสงค์จะบอกเลิกสัญญา
            ให้แจ้งเป็นลายลักษณ์อักษรให้อีกฝ่ายทราบล่วงหน้าไม่น้อยกว่า 30
            (สามสิบ) วัน ก่อนที่จะเลิกสัญญานี้ได้
            โดยไม่จำเป็นต้องแจ้งเหตุผลของการเลิกสัญญา
            และไม่ถือว่าคู่สัญญาฝ่ายนั้นผิดสัญญาแต่ประการใด
          </li>
          <li>
            ผู้รับจ้างจะจัดหาพนักงานรักษาความสะอาดเข้าปฏิบัติหน้าที่ตามสัญญา
            รายละเอียดตามเอกสารแนบท้ายสัญญา 1
          </li>
          <li>
            ผู้รับจ้างจะต้องจัดหาพนักงานรักษาความสะอาดเสริมหรือทดแทน
            กรณีที่พนักงานรักษาความสะอาดประจำมาปฏิบัติหน้าที่ไม่ได้
            โดยผู้รับจ้างจะเป็นผู้กำหนดวันหยุดของพนักงานของผู้รับจ้างเอง
            โดยไม่กระทบกับการทำงานตามสัญญา
            <span className="mt-1 block">
              หากพนักงานประจำมาไม่ได้ ผู้รับจ้างมีเวลาจัดหาพนักงานทดแทนภายใน
              3 ชั่วโมง นับจากเวลาเริ่มงานปกติ
            </span>
            <span className="mt-1 block">
              กรณีจัดหาพนักงานทดแทนไม่ได้เต็มวัน
              ผู้ว่าจ้างมีสิทธิตัดจ่ายค่าจ้างเฉพาะส่วนของพนักงานที่ไม่มาปฏิบัติงานตามอัตราส่วนรายวันจริง
              โดยคำนวณจาก (ค่าบริการรายเดือนของพนักงานตำแหน่งนั้น ÷
              จำนวนวันทำงานจริงในเดือนนั้น)
            </span>
            <span className="mt-1 block">
              กรณีจัดหาพนักงานทดแทนได้แต่ล่าช้ากว่ากำหนด
              ให้คิดค่าบริการตามส่วนชั่วโมงหรือครึ่งวันที่ได้ปฏิบัติงานจริง
            </span>
            <span className="mt-1 block">
              ผู้รับจ้างจะออกใบลดหนี้ (Credit Note)
              สำหรับยอดค่าบริการที่ถูกหักตามส่วนงานจริงดังกล่าว
              เพื่อนำไปเป็นส่วนลดในการวางบิลชำระเงินของเดือนนั้นหรือรอบถัดไป
            </span>
            <span className="mt-1 block">
              เมื่อผู้ว่าจ้างหักค่าบริการตามส่วนงานจริงที่ไม่ได้รับการปฏิบัติงานแล้ว
              ผู้ว่าจ้างตกลงจะไม่คิดค่าปรับหรือเรียกค่าเสียหายอื่นใดเพิ่มเติมอีก
              เพื่อไม่ให้ผู้รับจ้างเสียประโยชน์เกินสมควร
            </span>
          </li>
          <li>
            ผู้ว่าจ้างยินดีจ่ายค่าจ้างให้กับผู้รับจ้างสำหรับพนักงานรักษาความสะอาดประจำ
            ตามรายละเอียดที่ระบุไว้ในเอกสารแนบท้ายสัญญา 1
            (ซึ่งยังไม่รวมภาษีมูลค่าเพิ่ม) ภายในวันที่ 30 ของทุก ๆ เดือน
            โดยเงื่อนไขการวางบิลหรือโอนชำระเงินให้เป็นไปตามที่ผู้ว่าจ้างกำหนด
            <span className="mt-1 block">
              กรณีผู้ว่าจ้างชำระเงินล่าช้าเกินกว่าวันที่ 30 ของเดือน
              หรือเกินกำหนดชำระตามใบวางบิล
              ผู้ว่าจ้างยินยอมเสียดอกเบี้ยผิดนัดชำระในอัตราร้อยละ 3 ต่อปี
              นับแต่วันที่ครบกำหนดชำระจนกว่าจะชำระเสร็จสิ้น
            </span>
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
            โดยมีรายละเอียดตามเอกสารแนบท้ายสัญญา 2
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
        <ContractHeader title="เอกสารแนบท้ายสัญญา 1" />

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
              {roles.map((role) => (
                <tr key={role.id}>
                  <td>
                    <Fill value={role.title} fallback="........" />
                  </td>
                  <td>
                    <Fill value={ctx.work_days} fallback="........" />
                  </td>
                  <td>
                    <Fill value={ctx.work_hours} fallback="........" />
                  </td>
                  <td>
                    {role.count > 0 ? `${role.count} คน` : "...... คน"}
                  </td>
                  <td className="text-right">
                    {role.price_per_head > 0
                      ? `${role.price_per_head_text} บาท`
                      : "........ บาท"}
                  </td>
                  <td className="text-right">
                    {role.monthly > 0
                      ? `${role.monthly_text} บาท`
                      : "........ บาท"}
                  </td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td>รวม</td>
                <td />
                <td />
                <td>
                  {ctx.staff_count > 0
                    ? `${ctx.staff_count} คน`
                    : "...... คน"}
                </td>
                <td />
                <td className="text-right">
                  {ctx.monthly_total_raw > 0
                    ? `${ctx.monthly_total} บาท`
                    : "........ บาท"}
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
          กรณีผู้ว่าจ้างต้องการให้พนักงานปฏิบัติงานในวันหยุดนักขัตฤกษ์
          คิดค่าบริการเพิ่มในอัตรา{" "}
          <Fill value={ctx.holiday_rate} fallback="......" /> บาท/คน/วัน
          หรืออัตราชั่วโมงละ{" "}
          <Fill value={ctx.ot_rate} fallback="......" /> บาท
          ตามที่คู่สัญญาตกลงกัน
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
            ในกรณีที่พนักงานทำความสะอาดลาป่วยหรือลากิจล่วงหน้า
            ผู้รับจ้างต้องจัดส่งพนักงานเข้าทดแทนภายใน 3
            ชั่วโมงจากเวลาเริ่มงานปกติ หากจัดหาไม่ได้หรือมาปฏิบัติงานได้บางส่วน
            ให้หักค่าบริการตามส่วนงานจริงและออกใบลดหนี้ (Credit Note)
            ตามเงื่อนไขข้อ 4 ของสัญญาหลัก โดยไม่คิดค่าปรับเพิ่มเติม
          </li>
        </ol>

        <SignatureBlock ctx={ctx} />
      </article>

      <article className="contract-page">
        <ContractHeader
          title="เอกสารแนบท้ายสัญญา 2"
          subtitle="ขอบเขตงาน (Scope of Work) และรายการอุปกรณ์/น้ำยาทำความสะอาด"
        />

        <p className="mt-4">
          อ้างอิงสัญญาเลขที่ <Fill value={ctx.contract_no} /> หน่วยงาน{" "}
          <Fill value={ctx.client_name} />
        </p>

        <p className="mt-4 font-semibold">1. ขอบเขตงานและพื้นที่ให้บริการ</p>
        <MultilineFill
          value={ctx.sow_scope}
          fallback=".............................................................................................................................................."
        />

        <p className="mt-4 font-semibold">
          2. รายการอุปกรณ์ / เครื่องมือ / น้ำยาทำความสะอาด
        </p>
        <MultilineFill
          value={ctx.sow_equipment}
          fallback=".............................................................................................................................................."
        />

        <p className="mt-4 font-semibold">3. วัสดุสิ้นเปลืองที่ระบุในสัญญา</p>
        {ctx.consumable_lines.length > 0 ? (
          <ul className="mt-1 list-disc space-y-1 pl-6">
            {ctx.consumable_lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-neutral-500">
            ..............................................................................................................................................
          </p>
        )}

        <SignatureBlock ctx={ctx} />
      </article>
    </div>
  );
}
