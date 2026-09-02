import { InputHTMLAttributes, useState } from 'react';
import { EyeIcon, EyeOffIcon } from './icons';

export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field-wrap">
      <input {...props} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        className="password-eye-btn"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}
