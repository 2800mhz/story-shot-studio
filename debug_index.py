with open('src/pages/Index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

print('Total length:', len(content))
# Find last useCallback
idx = content.rfind('}, [dispatch]);')
print(f'Last [dispatch] at {idx}')
print(repr(content[idx:idx+200]))

# Find return
idx2 = content.find('  return (')
print(f'return ( at {idx2}')
print(repr(content[idx2-50:idx2+30]))
