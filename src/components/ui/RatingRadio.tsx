import styled from 'styled-components'

interface RatingRadioProps {
  /** Controlled value (1–5). Omit for uncontrolled. */
  value?: number
  /** Default selected value when uncontrolled. */
  defaultValue?: number
  /** Fired with the chosen rating (1–5). */
  onChange?: (rating: number) => void
  /** Radio group name — keep unique if you render more than one on a page. */
  name?: string
}

/**
 * Animated 5-star rating, rethemed to the brand amber palette.
 *
 * Ported from a styled-components snippet: hover scales + glows the star,
 * fires a particle burst above/below, and the selected star keeps a soft
 * pulse. Inactive stars adapt to light/dark via the `.dark` root class.
 */
export default function RatingRadio({ value, defaultValue, onChange, name = 'rating' }: RatingRadioProps) {
  return (
    <StyledWrapper>
      <div className="radio">
        {[1, 2, 3, 4, 5].map(n => (
          <span key={n} style={{ display: 'contents' }}>
            <input
              name={name}
              type="radio"
              id={`${name}-${n}`}
              value={n}
              checked={value !== undefined ? value === n : undefined}
              defaultChecked={value === undefined ? defaultValue === n : undefined}
              onChange={() => onChange?.(n)}
            />
            <label title={`${n} star${n > 1 ? 's' : ''}`} htmlFor={`${name}-${n}`}>
              <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 576 512">
                <path d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z" />
              </svg>
            </label>
          </span>
        ))}
      </div>
    </StyledWrapper>
  )
}

const StyledWrapper = styled.div`
  .radio {
    display: flex;
    justify-content: center;
    gap: 10px;
  }

  .radio > input {
    position: absolute;
    appearance: none;
  }

  .radio > label {
    cursor: pointer;
    font-size: 30px;
    position: relative;
    display: inline-block;
    transition: transform 0.3s ease;
  }

  /* Inactive star — neutral on light, lighter on dark. */
  .radio > label > svg {
    fill: #cbb89a;
    transition: fill 0.3s ease;
  }
  :global(html.dark) .radio > label > svg {
    fill: rgba(255, 255, 255, 0.22);
  }

  .radio > label::before,
  .radio > label::after {
    content: "";
    position: absolute;
    width: 6px;
    height: 6px;
    background-color: #d4820a;
    border-radius: 50%;
    opacity: 0;
    transform: scale(0);
    transition:
      transform 0.4s ease,
      opacity 0.4s ease;
    animation: particle-explosion 1s ease-out;
  }

  .radio > label::before {
    top: -15px;
    left: 50%;
    transform: translateX(-50%) scale(0);
  }

  .radio > label::after {
    bottom: -15px;
    left: 50%;
    transform: translateX(-50%) scale(0);
  }

  .radio > label:hover::before,
  .radio > label:hover::after {
    opacity: 1;
    transform: translateX(-50%) scale(1.5);
  }

  .radio > label:hover {
    transform: scale(1.2);
    animation: pulse 0.6s infinite alternate;
  }

  /* Star glow + animation on hover */
  .radio > label:hover > svg {
    fill: #d4820a;
    filter: drop-shadow(0 0 15px rgba(212, 130, 10, 0.9));
    animation: shimmer 1s ease infinite alternate;
  }

  .radio > input:checked + label > svg {
    fill: #d4820a;
    filter: drop-shadow(0 0 15px rgba(212, 130, 10, 0.9));
    animation: pulse 0.8s infinite alternate;
  }

  .radio > input:checked + label ~ label > svg,
  .radio > input:checked + label > svg {
    fill: #d4820a;
  }

  @keyframes pulse {
    0% {
      transform: scale(1);
    }
    100% {
      transform: scale(1.1);
    }
  }

  @keyframes particle-explosion {
    0% {
      opacity: 0;
      transform: scale(0.5);
    }
    50% {
      opacity: 1;
      transform: scale(1.2);
    }
    100% {
      opacity: 0;
      transform: scale(0.5);
    }
  }

  @keyframes shimmer {
    0% {
      filter: drop-shadow(0 0 10px rgba(212, 130, 10, 0.5));
    }
    100% {
      filter: drop-shadow(0 0 20px rgba(212, 130, 10, 1));
    }
  }

  .radio > input:checked + label:hover,
  .radio > input:checked + label:hover ~ label {
    fill: #b86d08;
  }

  .radio > label:hover,
  .radio > label:hover ~ label {
    fill: #d4820a;
  }

  .radio input:checked ~ label svg {
    fill: #e8a020;
  }
`
