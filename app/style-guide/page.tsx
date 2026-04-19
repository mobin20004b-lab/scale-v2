'use client';

import Link from 'next/link';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
  Select,
  Toast,
} from '@/components/ui';

const tokenRows = {
  color: ['primary', 'secondary', 'destructive', 'background', 'foreground', 'border', 'muted'],
  spacing: ['--space-1 ... --space-10'],
  radius: ['--radius-sm ... --radius-2xl', '--radius-input', '--radius-card', '--radius-modal'],
  shadow: ['--shadow-xs', '--shadow-sm', '--shadow-md', '--shadow-card', '--shadow-overlay'],
  typography: ['--text-xs ... --text-3xl'],
};

const variantMap = [
  ['Buttons', 'primary / secondary / destructive / outline / ghost'],
  ['Form fields', 'Input + Select + FormField helper/error text'],
  ['Cards', 'Card + Header + Content for dashboards/forms/lists'],
  ['Modals', 'Radix-based modal container with focus management'],
  ['Toasts', 'success / destructive / neutral status messages'],
];

const stateMap = [
  ['hover', 'Color contrast shift for affordance'],
  ['focus-visible', '2px ring with offset and accessible keyboard indicator'],
  ['disabled', 'Reduced opacity + no pointer events + not-allowed cursor'],
  ['error', 'Destructive border/ring and inline message through FormField'],
];

export default function StyleGuidePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">راهنمای سبک و کامپوننت‌ها</h1>
        <p className="mt-1 text-muted-foreground">توکن‌های طراحی استاندارد، نگاشت واریانت‌ها، و وضعیت‌های دسترس‌پذیری.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Design Tokens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {Object.entries(tokenRows).map(([category, values]) => (
            <div key={category} className="rounded-xl border border-border bg-background px-3 py-2">
              <div className="font-semibold capitalize">{category}</div>
              <div className="text-muted-foreground">{values.join(' • ')}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Variant Audit Map</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <tbody>
              {variantMap.map(([component, variants]) => (
                <tr key={component} className="border-b border-border/60 last:border-0">
                  <td className="py-2 font-medium">{component}</td>
                  <td className="py-2 text-muted-foreground">{variants}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accessibility States</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {stateMap.map(([state, desc]) => (
            <div key={state} className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2">
              <span className="font-medium">{state}</span>
              <span className="text-muted-foreground">{desc}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Component Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Input (error)" error="این فیلد اجباری است.">
              <Input data-invalid="true" placeholder="Type here..." />
            </FormField>
            <FormField label="Select">
              <Select defaultValue="warehouse-a">
                <option value="warehouse-a">انبار A</option>
                <option value="warehouse-b">انبار B</option>
              </Select>
            </FormField>
          </div>

          <div className="space-y-2">
            <Toast tone="success">ذخیره با موفقیت انجام شد.</Toast>
            <Toast tone="destructive">خطا در انجام عملیات.</Toast>
          </div>

          <Modal>
            <ModalTrigger asChild>
              <Button variant="secondary">نمونه Modal</Button>
            </ModalTrigger>
            <ModalContent>
              <ModalHeader>
                <ModalTitle>نمونه پنجره</ModalTitle>
                <ModalDescription>برای تایید یا مشاهده اطلاعات حساس از این الگو استفاده کنید.</ModalDescription>
              </ModalHeader>
              <div className="flex justify-end gap-2">
                <Button variant="ghost">انصراف</Button>
                <Button>تایید</Button>
              </div>
            </ModalContent>
          </Modal>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Example Links (Major Screens)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 text-sm">
            <Button asChild variant="outline" size="sm">
              <Link href="/">داشبورد</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/products">محصولات</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/settings">تنظیمات</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/reports">گزارش‌ها</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
