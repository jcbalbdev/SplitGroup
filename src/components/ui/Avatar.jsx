// src/components/ui/Avatar.jsx
// Avatar usando boring-avatars con preferencias guardadas en localStorage.
// El usuario actual puede personalizar el suyo; otros miembros ven el estilo por defecto.

import BoringAvatar from 'boring-avatars';
import { getVariantForEmail, getColorsForEmail } from '../../utils/avatarPrefs';

const SIZE_MAP = { xs: 20, sm: 28, md: 40, lg: 56, xl: 72 };

export function Avatar({ email = '', name = '', size = 'md', onClick, style = {} }) {
  const label   = email || name || '?';
  const px      = SIZE_MAP[size] ?? 40;
  const variant = getVariantForEmail(label);
  const colors  = getColorsForEmail(label);

  return (
    <div
      title={label}
      onClick={onClick}
      style={{
        width: px, height: px, borderRadius: '50%',
        overflow: 'hidden', flexShrink: 0, display: 'inline-flex',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      <BoringAvatar
        size={px}
        name={label}
        variant={variant}
        colors={colors}
        square={false}
      />
    </div>
  );
}
