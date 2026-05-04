import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeasoningComponent } from './seasoning.component';

describe('SeasoningComponent', () => {
  let component: SeasoningComponent;
  let fixture: ComponentFixture<SeasoningComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeasoningComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeasoningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
