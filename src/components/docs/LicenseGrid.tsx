import { OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import { Box, Link, Paper, Typography } from '@mui/material';
import React from 'react';

export interface LicenseGridProps {
  licenses: string[];
  links?: Record<string, string>;
}

const OFFICIAL_LICENSE_LINKS: Record<string, string> = {
  GPL: 'https://www.gnu.org/licenses/gpl-3.0.html',
  GPLv2: 'https://www.gnu.org/licenses/old-licenses/gpl-2.0.html',
  'GPLv2+': 'https://www.gnu.org/licenses/old-licenses/gpl-2.0.html',
  'GPLv2 + Classpath Exception': 'https://openjdk.org/legal/gplv2+ce.html',
  GPLv3: 'https://www.gnu.org/licenses/gpl-3.0.html',
  AGPLv3: 'https://www.gnu.org/licenses/agpl-3.0.html',
  'AGPL-3.0': 'https://www.gnu.org/licenses/agpl-3.0.html',
  LGPL: 'https://www.gnu.org/licenses/lgpl-3.0.html',
  'LGPLv2.1': 'https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html',
  'LGPL-2.1': 'https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html',
  MIT: 'https://opensource.org/license/mit',
  'Apache-2.0': 'https://www.apache.org/licenses/LICENSE-2.0',
  BSD: 'https://opensource.org/license/bsd-3-clause',
  'BSD-2-Clause': 'https://opensource.org/license/bsd-2-clause',
  GFDL: 'https://www.gnu.org/licenses/fdl-1.3.html',
  DFSG: 'https://www.debian.org/social_contract#guidelines',
  LPPL: 'https://www.latex-project.org/lppl/',
  'PSF License': 'https://docs.python.org/3/license.html',
  'Artistic License': 'https://dev.perl.org/licenses/artistic.html',
  'BSL 1.1': 'https://mariadb.com/bsl11/',
  'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
  'CC0 1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
};

const LicenseGrid: React.FC<LicenseGridProps> = ({ licenses, links = {} }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: 1.5,
    }}
  >
    {licenses.map((license) => {
      const href = links[license] ?? OFFICIAL_LICENSE_LINKS[license];
      const card = (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            height: '100%',
            borderRadius: 2,
            textAlign: 'center',
            bgcolor: 'action.hover',
            transition: 'border-color 0.15s, transform 0.15s',
            ...(href && {
              '&:hover': { borderColor: 'primary.main', transform: 'translateY(-1px)' },
            }),
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 750 }}>
            {license}
            {href && <OpenInNewIcon sx={{ ml: 0.75, fontSize: 15, verticalAlign: '-1px' }} />}
          </Typography>
        </Paper>
      );

      return href ? (
        <Link
          key={license}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          underline="none"
          color="inherit"
        >
          {card}
        </Link>
      ) : (
        <Box key={license}>{card}</Box>
      );
    })}
  </Box>
);

export default LicenseGrid;
