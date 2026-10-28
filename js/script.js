(() => {
  const hero = document.querySelector('.hero');
  const backToTop = document.querySelector('#back-to-top');
  if (backToTop) {
    const updateVisibility = () => {
      backToTop.hidden = hero
        ? hero.getBoundingClientRect().bottom > 0
        : window.scrollY <= 0;
    };
    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });
    window.addEventListener('resize', updateVisibility);
    backToTop.addEventListener('click', () => {
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      window.scrollTo({ top: 0, behavior });
    });
  }

  const menuToggle = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#primary-navigation');
  if (menuToggle && navigation) {
    const setMenu = (open) => {
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.querySelector('.visually-hidden').textContent = open ? 'Close navigation' : 'Open navigation';
      navigation.classList.toggle('is-open', open);
    };
    menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
    navigation.addEventListener('click', (event) => {
      if (event.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setMenu(false);
    });
  }

  const form = document.querySelector('#enquiry-form');
  if (!form) return;
  const tabs = Array.from(form.querySelectorAll('[role="tab"]'));
  const setActiveTab = (activeTab, moveFocus = false) => {
    tabs.forEach((tab) => {
      const selected = tab === activeTab;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      panel.hidden = !selected;
    });
    if (moveFocus) activeTab.focus();
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => setActiveTab(tab));
    tab.addEventListener('keydown', (event) => {
      let nextIndex;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = tabs.length - 1;
      if (nextIndex !== undefined) {
        event.preventDefault();
        setActiveTab(tabs[nextIndex], true);
      }
    });
  });
  const initiallySelected = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true');
  if (initiallySelected) setActiveTab(initiallySelected);
  const status = document.querySelector('#form-status');
  const baseRules = [
    { id: 'full-name', errorId: 'full-name-error', validate: (input) => input.value.trim() ? '' : 'Enter your full name.' },
    { id: 'work-email', errorId: 'work-email-error', validate: (input) => {
      if (!input.value.trim()) return 'Enter your work email address.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim()) ? '' : 'Enter an email address in the format name@company.com.';
    } },
    { id: 'company', errorId: 'company-error', validate: (input) => input.value.trim() ? '' : 'Enter your company name.' },
    { id: 'enquiry-type', errorId: 'enquiry-type-error', validate: (input) => input.value ? '' : 'Choose an enquiry type.' },
    { id: 'message', errorId: 'message-error', validate: (input) => input.value.trim() ? '' : 'Enter a message.' },
    { id: 'privacy-consent', errorId: 'privacy-error', validate: (input) => input.checked ? '' : 'Please agree to the privacy terms before submitting.' }
  ];
  const businessType = document.querySelector('#business-type');
  const businessRules = {
    'sole-trader': [{ id: 'trading-name', errorId: 'trading-name-error', validate: (input) => input.value.trim() ? '' : 'Enter the trading name.' }],
    'limited-company': [{ id: 'company-registration', errorId: 'company-registration-error', validate: (input) => input.value.trim() ? '' : 'Enter the Companies House number.' }]
  };
  const soleTraderFields = document.querySelector('#sole-trader-fields');
  const limitedCompanyFields = document.querySelector('#limited-company-fields');
  const signatoryList = document.querySelector('#signatory-list');
  const signatoryTemplate = document.querySelector('#signatory-template');
  let signatoryCount = 0;
  let simulateFailure = new URLSearchParams(window.location.search).get('demoFailure') === '1';
  let attempted = false;

  const clearStatus = () => {
    status.hidden = true;
    status.textContent = '';
    status.classList.remove('is-error');
  };
  const updateRepayment = () => {
    const amount = Number(document.querySelector('#loan-amount').value);
    const rateValue = document.querySelector('#interest-rate').value;
    const annualRate = Number(rateValue);
    const years = Number(document.querySelector('#loan-term').value);
    const output = document.querySelector('#estimated-repayment');
    if (!(amount > 0) || rateValue === '' || !(years > 0) || !Number.isFinite(annualRate) || annualRate < 0 || annualRate > 100 || years > 40) {
      output.textContent = 'Enter loan details';
      return;
    }
    const months = Math.round(years * 12);
    const monthlyRate = annualRate / 1200;
    const payment = monthlyRate === 0
      ? amount / months
      : amount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
    output.textContent = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(payment) + ' / month';
  };
  const updateBusinessFields = () => {
    const soleTrader = businessType.value === 'sole-trader';
    const limitedCompany = businessType.value === 'limited-company';
    [[soleTraderFields, soleTrader], [limitedCompanyFields, limitedCompany]].forEach(([group, visible]) => {
      group.hidden = !visible;
      group.querySelectorAll('input, select, textarea').forEach((input) => {
        input.disabled = !visible;
        if (!visible) {
          input.removeAttribute('aria-invalid');
          const error = document.getElementById(input.getAttribute('aria-describedby'));
          if (error) error.textContent = '';
        }
      });
    });
  };
  const currentRules = () => {
    const rules = [...baseRules,
      { id: 'business-type', errorId: 'business-type-error', validate: (input) => input.value ? '' : 'Choose a business structure.' },
      ...(businessRules[businessType.value] || [])
    ];
    signatoryList.querySelectorAll('.signatory-card').forEach((card) => {
      const inputs = card.querySelectorAll('input');
      rules.push(
        { id: inputs[0].id, errorId: inputs[0].getAttribute('aria-describedby'), validate: (input) => input.value.trim() ? '' : 'Enter the signatory’s full name.' },
        { id: inputs[1].id, errorId: inputs[1].getAttribute('aria-describedby'), validate: (input) => input.value.trim() ? '' : 'Enter the signatory’s role.' },
        { id: inputs[2].id, errorId: inputs[2].getAttribute('aria-describedby'), validate: (input) => {
          if (!input.value.trim()) return 'Enter the signatory’s email address.';
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim()) ? '' : 'Enter a valid email address.';
        } }
      );
    });
    return rules;
  };
  const validateField = (rule) => {
    const input = document.getElementById(rule.id);
    const message = rule.validate(input);
    const error = document.getElementById(rule.errorId);
    error.textContent = message;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    return !message;
  };
  const validateForm = () => currentRules().map(validateField).every(Boolean);
  const announce = (message, isError = false) => {
    status.replaceChildren();
    status.classList.toggle('is-error', isError);
    status.append(document.createTextNode(message));
    if (isError) {
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = 'Retry';
      retry.addEventListener('click', () => {
        simulateFailure = false;
        clearStatus();
        form.requestSubmit();
      }, { once: true });
      status.append(retry);
    }
    status.hidden = false;
    status.focus();
  };
  ['loan-amount', 'interest-rate', 'loan-term'].forEach((id) => document.getElementById(id).addEventListener('input', updateRepayment));
  document.querySelector('#add-signatory').addEventListener('click', () => {
    const index = signatoryCount++;
    const fragment = signatoryTemplate.content.cloneNode(true);
    const card = fragment.querySelector('.signatory-card');
    card.querySelector('.signatory-number').textContent = String(signatoryList.children.length + 1);
    card.querySelectorAll('[id], [for], [name], [aria-describedby]').forEach((element) => {
      ['id', 'for', 'name', 'aria-describedby'].forEach((attribute) => {
        if (element.hasAttribute(attribute)) element.setAttribute(attribute, element.getAttribute(attribute).replaceAll('__index__', String(index)));
      });
    });
    card.querySelector('.remove-signatory').setAttribute('aria-label', `Remove authorised signatory ${signatoryList.children.length + 1}`);
    signatoryList.append(fragment);
    signatoryList.lastElementChild.querySelector('input').focus();
  });
  signatoryList.addEventListener('click', (event) => {
    const remove = event.target.closest('.remove-signatory');
    if (!remove) return;
    const card = remove.closest('.signatory-card');
    const previous = card.previousElementSibling;
    const next = card.nextElementSibling;
    card.remove();
    signatoryList.querySelectorAll('.signatory-card').forEach((item, index) => {
      item.querySelector('.signatory-number').textContent = String(index + 1);
      item.querySelector('.remove-signatory').setAttribute('aria-label', `Remove authorised signatory ${index + 1}`);
    });
    (next || previous || document.querySelector('#add-signatory')).focus();
    clearStatus();
  });
  businessType.addEventListener('change', () => {
    updateBusinessFields();
    if (attempted) currentRules().forEach(validateField);
    clearStatus();
  });
  updateBusinessFields();
  updateRepayment();

  form.addEventListener('input', (event) => {
    if (attempted) {
      const rule = currentRules().find((item) => item.id === event.target.id);
      if (rule) validateField(rule);
    }
    clearStatus();
  });
  form.addEventListener('change', (event) => {
    const rule = currentRules().find((item) => item.id === event.target.id);
    if (attempted && rule) validateField(rule);
    clearStatus();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    attempted = true;
    clearStatus();
    if (!validateForm()) {
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) {
        if (firstInvalid.closest('#calculator-panel')) setActiveTab(document.querySelector('#calculator-tab'));
        firstInvalid.focus();
      }
      return;
    }
    if (simulateFailure) {
      announce('The submission encountered an error. Your information is still in the form and has not been sent. You can retry.', true);
      return;
    }
    announce('Thank you for your interest in Barclays Corporate Banking. Your information has been submitted successfully.');
    form.reset();
    signatoryList.replaceChildren();
    signatoryCount = 0;
    updateBusinessFields();
    updateRepayment();
    attempted = false;
    [...baseRules, { id: 'business-type' }].forEach(({ id }) => document.getElementById(id).removeAttribute('aria-invalid'));
  });
})();
