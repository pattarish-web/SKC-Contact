# สั่งการ คลีน — จัดทำสัญญา + คลังสัญญา Google Sheet

เว็บจัดทำสัญญาจ้างทำความสะอาดของบริษัท **สั่งการ คลีน จำกัด** คลังสัญญาอยู่ที่ [Google Sheet sck-contact](https://docs.google.com/spreadsheets/d/1Os1IdvKUPhuzBS0o765T3W_vnllgr_x03lfgfta2Tow/edit?usp=sharing) ไม่ใช้เซิร์ฟเวอร์ Node

## ใช้ทำอะไรได้

- กรอกข้อมูลผู้ว่าจ้าง ระยะเวลา พนักงาน และอัตราค่าจ้าง
- พิมพ์ / บันทึก PDF (A4)
- คลังสัญญาใน Google Sheet — ทุกเครื่องเห็นชุดเดียวกัน
- ส่งออก / นำเข้าไฟล์สำรองได้
- โฮสต์บน GitHub Pages ได้

## วิธีรันบนเครื่อง

ต้องมี Node.js 18 ขึ้นไปเฉพาะตอนพัฒนา

```bash
npm install
npm test
npm run dev
```

เปิด [http://localhost:43141](http://localhost:43141)

## เชื่อมชีตให้บันทึกข้ามเครื่องได้

ลิงก์เว็บแอปถูกอบไว้ในแอปแล้ว อ่าน-เขียนคลังได้เลย ถ้าต้องเปลี่ยนการเชื่อมต่อ กด **เปลี่ยนการเชื่อมต่อ** ที่แถบด้านล่างของคลังสัญญา:

1. เปิด [ชีต sck-contact](https://docs.google.com/spreadsheets/d/1Os1IdvKUPhuzBS0o765T3W_vnllgr_x03lfgfta2Tow/edit?usp=sharing)
2. ส่วนขยาย → Apps Script
3. วางโค้ดจาก `scripts/SheetLibrary.gs` (หรือกดคัดลอกในหน้าคลัง)
4. Deploy → New deployment → Web app
5. Execute as: Me · Who has access: Anyone
6. วางลิงก์ `/exec` แล้วกดใช้ลิงก์นี้

ถ้าต้องการกันคนนอกเขียน ให้ตั้ง Script property ชื่อ `WRITE_TOKEN` แล้ววางรหัสเดียวกันในช่องรหัสเขียนของแอป

แอปจะสร้างแท็บ `สัญญา` และคอลัมน์เลขที่สัญญา ผู้ว่าจ้าง วันที่ และ JSON ฉบับเต็ม

ไฟล์แนบอยู่เฉพาะเครื่องที่อัปโหลด ไม่ตามไปชีต — ส่งออกไฟล์คลังถ้าต้องย้ายเอกสารสำคัญ

ถ้าเน็ตหลุดตอนบันทึก รายการยังอยู่ในเครื่องนี้ และจะส่งขึ้นชีตใหม่อัตโนมัติเมื่อเชื่อมได้

## เผยแพร่ GitHub Pages

```bash
npm run build
./scripts/deploy-pages.sh
```

เปิด [https://pattarish-web.github.io/SKC-Contact/](https://pattarish-web.github.io/SKC-Contact/)

## พิมพ์สัญญา

1. กรอกข้อมูลให้ครบหรือกด **ตัวอย่าง**
2. กด **พิมพ์ / PDF**
3. เลือกกระดาษ A4 ตั้งระยะขอบน้อยที่สุด และปิดหัวท้ายหน้า
