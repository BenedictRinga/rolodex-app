import { Injectable } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable({
  providedIn: 'root',
})
export class FormvalidationService {
  /**
   * Recursively marks every control in a FormGroup (and nested groups/arrays)
   * as touched — useful for surfacing all validation errors on submit.
   */
  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      control.markAsDirty();
      control.updateValueAndValidity({ onlySelf: true });

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach((c) => {
          c.markAsTouched();
          c.markAsDirty();
          if (c instanceof FormGroup) {
            this.markFormGroupTouched(c);
          }
        });
      }
    });
  }

  /**
   * Recursively triggers value-and-validity updates on all controls in a form.
   */
  validateAllFormFields(form: FormGroup): void {
    Object.values(form.controls).forEach((control) => {
      control.updateValueAndValidity({ onlySelf: true });

      if (control instanceof FormGroup) {
        this.validateAllFormFields(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach((c) => {
          c.updateValueAndValidity({ onlySelf: true });
          if (c instanceof FormGroup) {
            this.validateAllFormFields(c);
          }
        });
      }
    });
  }

  /**
   * Converts a Capacitor-style birthday object `{day, month, year}` to an
   * ISO date string `YYYY-MM-DD`, or an empty string when absent.
   */
  convertBirthdayToDate(birthday: any): string {
    if (!birthday || !birthday.year) {
      return '';
    }
    const y = String(birthday.year).padStart(4, '0');
    const m = String(birthday.month ?? 1).padStart(2, '0');
    const d = String(birthday.day ?? 1).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Form-level validator that requires at least one entry in the `phones`
   * FormArray (with a non‑empty number) OR at least one entry in the
   * `emails` FormArray (with a non‑empty address). Returns `null` when valid.
   *
   * Named `atLeastOnePhoneOrEmail2` to avoid collision with the identically
   * named standalone factory below.
   */
  atLeastOnePhoneOrEmail2(control: AbstractControl): ValidationErrors | null {
    const group = control as FormGroup;

    const phones = group.get('phones') as FormArray | null;
    const emails = group.get('emails') as FormArray | null;

    const hasPhone = phones?.controls?.some(
      (c) => c.get('number')?.value?.toString().trim() !== ''
    );
    const hasEmail = emails?.controls?.some(
      (c) => c.get('address')?.value?.toString().trim() !== ''
    );

    return hasPhone || hasEmail ? null : { atLeastOnePhoneOrEmail: true };
  }
}

// ---------------------------------------------------------------------------
// Standalone validator factories
// ---------------------------------------------------------------------------

/**
 * Form-level validator: requires at least one phone with a number, or one
 * email with an address, or one postal address with a street.
 */
export function atLeastOneContactMethod(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const group = control as FormGroup;

    const phones = group.get('phones') as FormArray | null;
    const emails = group.get('emails') as FormArray | null;
    const addresses = group.get('postalAddresses') as FormArray | null;

    const hasPhone = phones?.controls?.some(
      (c) => c.get('number')?.value?.toString().trim() !== ''
    );
    const hasEmail = emails?.controls?.some(
      (c) => c.get('address')?.value?.toString().trim() !== ''
    );
    const hasAddress = addresses?.controls?.some(
      (c) => c.get('street')?.value?.toString().trim() !== ''
    );

    return hasPhone || hasEmail || hasAddress
      ? null
      : { atLeastOneContactMethod: true };
  };
}

/**
 * Form-level validator: requires at least one phone with a number or one
 * email with an address.
 */
export function atLeastOnePhoneOrEmail(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const group = control as FormGroup;

    const phones = group.get('phones') as FormArray | null;
    const emails = group.get('emails') as FormArray | null;

    const hasPhone = phones?.controls?.some(
      (c) => c.get('number')?.value?.toString().trim() !== ''
    );
    const hasEmail = emails?.controls?.some(
      (c) => c.get('address')?.value?.toString().trim() !== ''
    );

    return hasPhone || hasEmail ? null : { atLeastOnePhoneOrEmail: true };
  };
}

/**
 * Control-level validator: checks that a phone number only contains
 * characters allowed in international phone numbers (+, digits, spaces,
 * dashes, parentheses).
 */
export function validPhoneNumberFormat(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value || value.toString().trim() === '') {
      return null; // let required handle emptiness
    }
    const pattern = /^[+\d\s\-().extEXT]+$/;
    return pattern.test(value.toString())
      ? null
      : { validPhoneNumberFormat: true };
  };
}

/**
 * Control-level validator: checks that an email's domain is present in the
 * supplied allowed-domains list. Passes if the control is empty (let
 * required handle emptiness).
 */
export function emailDomainValidator(allowedDomains: string[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value || '').toString().trim().toLowerCase();
    if (!value) {
      return null;
    }
    const domain = value.split('@')[1];
    if (!domain) {
      return { emailDomain: true };
    }
    return allowedDomains.some((d) => d.toLowerCase() === domain)
      ? null
      : { emailDomain: { allowedDomains } };
  };
}

/**
 * Control-level validator: validates that the birthday value is between
 * `minAge` and `maxAge` years ago. Expects an ISO date string (`YYYY-MM-DD`)
 * or a Date object.
 */
export function birthdayRangeValidator(
  minAge: number,
  maxAge: number
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) {
      return null; // let required handle emptiness
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return { birthdayRange: { minAge, maxAge } };
    }

    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < date.getDate())
    ) {
      age--;
    }

    if (age < minAge || age > maxAge) {
      return { birthdayRange: { minAge, maxAge, actual: age } };
    }

    return null;
  };
}

/**
 * Control-level validator: validates that comma-separated tags are unique
 * (case-insensitive). Trims whitespace around each tag.
 */
export function uniqueTags(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value || '').toString().trim();
    if (!value) {
      return null;
    }
    const tags = value
      .split(',')
      .map((t: string) => t.trim().toLowerCase())
      .filter((t: string) => t.length > 0);

    const unique = new Set(tags);
    return unique.size === tags.length ? null : { uniqueTags: true };
  };
}

/**
 * Composes an array of validators, silently skipping null/undefined entries.
 * Returns `null` when the array is empty or all entries are null.
 */
export function safeCompose(validators: ValidatorFn[]): ValidatorFn {
  const filtered = validators.filter(
    (v): v is ValidatorFn => v !== null && v !== undefined
  );
  if (filtered.length === 0) {
    return () => null;
  }
  return Validators.compose(filtered)!;
}

/**
 * Converts a Capacitor-style birthday object `{day, month, year}` to an
 * ISO date string `YYYY-MM-DD`, or an empty string when absent.
 */
export function convertBirthdayToDate(birthday: any): string {
  if (!birthday || !birthday.year) {
    return '';
  }
  const y = String(birthday.year).padStart(4, '0');
  const m = String(birthday.month ?? 1).padStart(2, '0');
  const d = String(birthday.day ?? 1).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
