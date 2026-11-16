"""Fill the logo paths from brand/logo/miri-logo.svg into the brand book template."""
import os, re
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
paths = re.findall(r'd="([^"]+)"', open(os.path.join(root, 'brand/logo/miri-logo.svg')).read())
html = open(os.path.join(root, 'tools/brand-book.template.html'), encoding='utf-8').read()
for i, d in enumerate(paths):
    html = html.replace('{{P%d}}' % i, d)
open(os.path.join(root, 'brand-book.html'), 'w', encoding='utf-8').write(html)
print('brand-book.html written')
