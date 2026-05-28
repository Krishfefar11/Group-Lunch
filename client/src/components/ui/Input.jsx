import { useState } from 'react';
import { colors, font, radius, transition } from '../../design-system/tokens';

export default function Input({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  error,
  hint,
  prefix,
  autoFocus,
  style = {},
  inputStyle = {},
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ marginBottom: 16, ...style }}>
      {label && (
        <label style={{
          display:     'block',
          fontSize:    font.size.xs,
          fontWeight:  font.weight.semibold,
          color:       focused ? colors.text.gold : colors.text.secondary,
          marginBottom: 6,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          transition:  transition.fast,
        }}>
          {label}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {prefix && (
          <span style={{
            position: 'absolute',
            left: 14,
            color: colors.text.muted,
            fontSize: font.size.base,
            pointerEvents: 'none',
          }}>
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width:        '100%',
            background:   colors.bg.raised,
            border:       `1px solid ${error ? 'rgba(239,68,68,0.5)' : focused ? colors.border.focus : colors.border.default}`,
            borderRadius: radius.md,
            color:        colors.text.primary,
            fontFamily:   font.family,
            fontSize:     font.size.base,
            padding:      prefix ? '12px 16px 12px 40px' : '12px 16px',
            outline:      'none',
            boxSizing:    'border-box',
            transition:   transition.base,
            boxShadow:    focused ? `0 0 0 3px rgba(240,165,0,0.12)` : 'none',
            '::placeholder': { color: colors.text.muted },
            ...inputStyle,
          }}
        />
      </div>

      {error && (
        <p style={{
          fontSize: font.size.xs,
          color: colors.red.text,
          marginTop: 5,
          letterSpacing: '0.01em',
        }}>
          {error}
        </p>
      )}
      {hint && !error && (
        <p style={{
          fontSize: font.size.xs,
          color: colors.text.muted,
          marginTop: 5,
        }}>
          {hint}
        </p>
      )}
    </div>
  );
}
